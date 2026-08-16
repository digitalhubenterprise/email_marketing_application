import ftplib
import os

def main():
    host = os.environ["BACKUP_FTP_HOST"]
    user = os.environ["BACKUP_FTP_USER"]
    password = os.environ["BACKUP_FTP_PASSWORD"]
    
    print("Connecting...")
    ftp = ftplib.FTP()
    ftp.connect(host, 21)
    ftp.login(user, password)
    print("Logged in!")
    ftp.cwd("/Remote_Backups_SMartCampains")
    
    print("Trying mlsd...")
    try:
        files = list(ftp.mlsd())
        print("mlsd succeeded! Files:")
        for name, info in files:
            print(f" - {name}: {info}")
    except Exception as e:
        print(f"mlsd failed: {e}")
        
    print("Trying nlst...")
    try:
        files = ftp.nlst()
        print(f"nlst succeeded! Files: {files}")
    except Exception as e:
        print(f"nlst failed: {e}")
        
    ftp.quit()

if __name__ == "__main__":
    main()
