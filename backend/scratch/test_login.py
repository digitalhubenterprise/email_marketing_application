import urllib.request
import urllib.parse
import json

register_url = "http://localhost:8000/api/auth/register"
login_url = "http://localhost:8000/api/auth/login"

# 1. Register User
reg_data = json.dumps({
    "email": "freshuser@gmail.com",
    "password": "Password123#"
}).encode("utf-8")

req_reg = urllib.request.Request(register_url, data=reg_data, method="POST")
req_reg.add_header("Content-Type", "application/json")

try:
    print("Registering new user...")
    with urllib.request.urlopen(req_reg, timeout=5) as response:
        print(f"Register Status Code: {response.status}")
        print(f"Register Response: {response.read().decode('utf-8')}")
except urllib.error.HTTPError as e:
    print(f"Register HTTP Error: {e.code}")
    print(f"Register Body: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Register Failed to connect: {e}")

# 2. Login User
login_data = urllib.parse.urlencode({
    "username": "freshuser@gmail.com",
    "password": "Password123#"
}).encode("utf-8")

req_login = urllib.request.Request(login_url, data=login_data, method="POST")
req_login.add_header("Content-Type", "application/x-www-form-urlencoded")

try:
    print("\nLogging in...")
    with urllib.request.urlopen(req_login, timeout=5) as response:
        print(f"Login Status Code: {response.status}")
        print(f"Login Response: {response.read().decode('utf-8')}")
except urllib.error.HTTPError as e:
    print(f"Login HTTP Error: {e.code}")
    print(f"Login Body: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Login Failed: {e}")
