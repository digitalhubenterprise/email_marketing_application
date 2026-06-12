from app.main import app

def main():
    for route in app.routes:
        print(f"Path: {route.path} | Methods: {route.methods}")

if __name__ == "__main__":
    main()
