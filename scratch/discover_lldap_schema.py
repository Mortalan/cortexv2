import json
import urllib.request
import sys

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

def graphql_query(token, query):
    url = "http://172.19.0.13:17170/api/graphql"
    payload = {"query": query}
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
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))

def main():
    token = get_token()
    print("Logged in successfully.")
    
    # Introspect CreateUserInput
    query = """
    query {
      __type(name: "CreateUserInput") {
        inputFields {
          name
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }
    """
    res = graphql_query(token, query)
    print("CreateUserInput Fields:")
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
