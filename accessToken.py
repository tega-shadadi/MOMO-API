import base64
import requests

subscription_key = "27d5cd352e0743b0ac74302b4e196f2e"
api_key = "397bdcfcf9f34f17905e0b647e7441de"  # from step 2
api_user= "86020a90-459b-4dd5-944f-1d165e1fb410"
# Encode user:apikey into base64
basic_auth = base64.b64encode(f"{api_user}:{api_key}".encode()).decode()

url = "https://ericssonbasicapi2.azure-api.net/collection/token/"
headers = {
    "Authorization": f"Basic {basic_auth}",
    "Ocp-Apim-Subscription-Key": subscription_key,
    "Content-Type": "application/json"
}

res = requests.post(url, headers=headers)
print("Status:", res.status_code)
print("Response:", res.json())  # Contains access_token
