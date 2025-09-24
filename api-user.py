import requests, uuid

subscription_key = "27d5cd352e0743b0ac74302b4e196f2e"  # your subscription key
api_user = str(uuid.uuid4())  # unique ID

url = "https://ericssonbasicapi2.azure-api.net/v1_0/apiuser"
headers = {
    "Ocp-Apim-Subscription-Key": subscription_key,
    "X-Reference-Id": api_user,
    "Content-Type": "application/json"
}
body = {
    "providerCallbackHost": "https://yourdomain.com"  # put your app/callback domain
}

res = requests.post(url, json=body, headers=headers)
print("Status:", res.status_code)
print("Response:", res.text)
print("Your API User:", api_user)

url = f"https://ericssonbasicapi2.azure-api.net/v1_0/apiuser/{api_user}/apikey"
headers = {
    "Ocp-Apim-Subscription-Key": subscription_key,
    "Content-Type": "application/json"
}

res = requests.post(url, headers=headers)
print("Status:", res.status_code)
print("Response:", res.text)  # This will contain {"apiKey": "..."}
