import ftplib

def inspect_ftp():
    host = "67.211.221.230"
    user = "smartcampaign@st39582.ispot.cc"
    password = "rJY2Dv9kbmedKkwfYra7"
    
    print("Connecting to FTP...")
    ftp = ftplib.FTP()
    ftp.connect(host, 21)
    ftp.login(user, password)
    print("Logged in!")
    
    # 1. Print current working directory
    print("Initial directory:", ftp.pwd())
    
    # 2. List initial directory
    print("Initial directory list:")
    files = ftp.nlst()
    for f in files[:10]:
        print(" -", f)
        
    # 3. Try to change to target path
    print("\nRecursively walking FTP directory tree...")
    def walk_dir(path):
        print(f"\nWalking directory: {path}")
        try:
            ftp.cwd(path)
        except Exception as e:
            print(f"Failed to cwd to {path}: {e}")
            return
        
        try:
            items = ftp.nlst()
        except Exception as e:
            print(f"Failed to list {path}: {e}")
            return
            
        for item in items:
            # Skip parent/current directories if returned
            if item in (".", ".."):
                continue
            item_path = f"{path.rstrip('/')}/{item}"
            print(f" Found: {item_path}")
            # Try to cwd into it to see if it's a directory
            try:
                ftp.cwd(item)
                # If success, it's a directory, so recurse
                ftp.cwd(path) # Go back
                walk_dir(item_path)
            except Exception:
                # It's a file
                pass
                
    walk_dir("/")
        
    # 4. Check if a folder named "home" was created in the initial directory
    print("\nChecking for nested folders...")
    try:
        ftp.cwd("/")
        ftp.cwd("home")
        print("Found a nested '/home' folder at FTP root!")
        print("Current directory:", ftp.pwd())
        print("Nested home files:", ftp.nlst())
        
        # Traverse deep
        ftp.cwd("st39582/domains/st39582.ispot.cc/Remote_Backups_SMartCampains")
        print("Deep nested directory:", ftp.pwd())
        print("Files inside deep nested directory:")
        for f in ftp.nlst():
            print(" -", f)
    except Exception as e:
        print("No nested 'home' directory found, or failed to traverse:", e)
        
    ftp.quit()

if __name__ == "__main__":
    inspect_ftp()
