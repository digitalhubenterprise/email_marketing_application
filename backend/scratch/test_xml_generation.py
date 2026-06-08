from app.api.dhru import dict_to_xml

# Test structure
services = [
    {
        "SERVICEID": "1",
        "SERVICENAME": "Starter Plan",
        "CREDIT": "1.00"
    }
]

# XML format structure
data_xml = {
    "SUCCESS": [
        {
            "LIST": [
                {
                    "GROUPNAME": "Service Group",
                    "GROUPTYPE": "SERVER",
                    "SERVICES": services
                }
            ]
        }
    ]
}

print("=== XML Response Output ===")
print(dict_to_xml(data_xml))
