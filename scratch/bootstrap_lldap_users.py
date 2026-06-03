import json
import urllib.request
import sys
import subprocess

def get_token():
    url = "http://172.19.0.13:17170/auth/simple/login"
    data = json.dumps({"username": "admin", "password": "password"}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req) as res:
            resp = json.loads(res.read().decode("utf-8"))
            return resp.get("token")
    except Exception as e:
        print(f"Failed to login: {e}")
        sys.exit(1)

def graphql_query(token, query, variables=None):
    url = "http://172.19.0.13:17170/api/graphql"
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"HTTPError: {e.code} - {e.reason}")
        print(f"Response body: {body}")
        try:
            return json.loads(body)
        except Exception:
            sys.exit(1)

def main():
    token = get_token()
    print("[+] Logged into LLDAP API successfully.")

    # 1. Load users from permissions.json
    perm_path = "/mnt/data_lake/audit/permissions.json"
    try:
        with open(perm_path, "r") as f:
            permissions_data = json.load(f)
    except Exception as e:
        print(f"[-] Failed to read {perm_path}: {e}")
        # fallback to local file in case mounting is different
        perm_path = "/home/louis/cortex/mnt/data_lake/audit/permissions.json"
        with open(perm_path, "r") as f:
            permissions_data = json.load(f)
    
    users = permissions_data.get("users", [])
    print(f"[+] Loaded {len(users)} users from permissions.json.")

    # 2. Get existing groups
    groups_res = graphql_query(token, "query { groups { id displayName } }")
    existing_groups = {g["displayName"]: g["id"] for g in groups_res["data"]["groups"]}
    print(f"[+] Existing LLDAP groups: {existing_groups}")

    # 3. Get existing users
    users_res = graphql_query(token, "query { users { id displayName } }")
    existing_users = {u["id"]: u["displayName"] for u in users_res["data"]["users"]}
    print(f"[+] Existing LLDAP users: {list(existing_users.keys())}")

    # 4. Create missing groups
    required_groups = list(set(u["role"] for u in users if "role" in u))
    print(f"[*] Required groups: {required_groups}")
    
    for group_name in required_groups:
        if group_name not in existing_groups:
            print(f"[*] Creating group: {group_name}")
            create_group_mutation = f"""
            mutation {{
              createGroup(name: "{group_name}") {{
                id
                displayName
              }}
            }}
            """
            res = graphql_query(token, create_group_mutation)
            if "errors" in res:
                print(f"[-] Error creating group {group_name}: {res['errors']}")
            else:
                new_group = res["data"]["createGroup"]
                existing_groups[group_name] = new_group["id"]
                print(f"[+] Created group {group_name} with ID {new_group['id']}")

    # 5. Create users and set passwords
    for user_info in users:
        username = user_info["username"]
        # LLDAP usernames should be lowercase
        lldap_username = username.lower()
        display_name = username
        email = f"{lldap_username}@rmmservice.co.za"
        password = user_info.get("password", "password")
        role = user_info.get("role")

        if lldap_username not in existing_users:
            print(f"[*] Creating user: {lldap_username}")
            create_user_mutation = f"""
            mutation {{
              createUser(user: {{
                id: "{lldap_username}",
                email: "{email}",
                displayName: "{display_name}"
              }}) {{
                id
              }}
            }}
            """
            res = graphql_query(token, create_user_mutation)
            if "errors" in res:
                print(f"[-] Error creating user {lldap_username}: {res['errors']}")
                continue
            print(f"[+] User {lldap_username} created successfully.")
        
        # Set password using the docker exec utility
        print(f"[*] Setting password for {lldap_username}...")
        cmd = [
            "docker", "exec", "lldap",
            "/app/lldap_set_password",
            "--base-url", "http://localhost:17170",
            "--admin-username", "admin",
            "--admin-password", "password",
            "--username", lldap_username,
            "--password", password
        ]
        
        # We run it via subprocess
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            print(f"[+] Password set successfully for {lldap_username}.")
        except subprocess.CalledProcessError as e:
            print(f"[-] Failed to set password for {lldap_username}: {e.stderr}")
            continue

        # Add to group
        if role and role in existing_groups:
            group_id = existing_groups[role]
            print(f"[*] Adding {lldap_username} to group {role} (ID: {group_id})...")
            
            # Introspect mutation for addUserToGroup:
            # Let's query to find what addUserToGroup returns.
            # LLDAP schema: addUserToGroup(userId: String!, groupId: Int!): Boolean!
            # Let's query
            add_member_mutation = f"""
            mutation {{
              addUserToGroup(userId: "{lldap_username}", groupId: {group_id}) {{
                ok
              }}
            }}
            """
            res = graphql_query(token, add_member_mutation)
            if "errors" in res:
                print(f"[-] Error adding {lldap_username} to {role}: {res['errors']}")
            else:
                print(f"[+] Added {lldap_username} to group {role}.")

if __name__ == "__main__":
    main()
