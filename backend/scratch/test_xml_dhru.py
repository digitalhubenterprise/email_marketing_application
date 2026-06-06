import urllib.request
import urllib.parse

def test():
    dhru_url = "http://localhost:8000/api/dhru"
    
    # 1. Test JSON format
    payload_json = {
        "username": "ipsabdurrazzak",
        "apiaccesskey": "Amin@1234",
        "action": "accountinfo",
        "requestformat": "JSON"
    }
    data_json = urllib.parse.urlencode(payload_json).encode("utf-8")
    req = urllib.request.Request(dhru_url, data=data_json, headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req) as res:
            print("JSON Response Status:", res.status)
            print("JSON Response Headers:", res.headers.get("content-type"))
            print("JSON Response Body:", res.read().decode("utf-8"))
    except Exception as e:
        print("JSON request failed:", e)
    
    # 2. Test XML format
    payload_xml = {
        "username": "ipsabdurrazzak",
        "apiaccesskey": "Amin@1234",
        "action": "accountinfo",
        "requestformat": "XML"
    }
    data_xml = urllib.parse.urlencode(payload_xml).encode("utf-8")
    req = urllib.request.Request(dhru_url, data=data_xml, headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req) as res:
            print("\nXML Response Status:", res.status)
            print("XML Response Headers:", res.headers.get("content-type"))
            print("XML Response Body:", res.read().decode("utf-8"))
    except Exception as e:
        print("XML request failed:", e)

if __name__ == "__main__":
    test()
