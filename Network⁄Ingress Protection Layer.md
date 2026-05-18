http:
  routers:
    viki-intelligence-secure:
      rule: "Host(`viki.rmmservice.co.za`)"
      entryPoints:
        - websecure
      service: viki-ollama-backend
      middlewares:
        - authelia-admin-only-gate

  middlewares:
    authelia-admin-only-gate:
      forwardAuth:
        address: "http://authelia:9091/api/verify?auth=basic" # Enforces standard administrative validation
