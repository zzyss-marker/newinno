from locust import HttpUser, TaskSet, task, between

class UserBehavior(TaskSet):
    @task(1)
    def index(self):
        self.client.get("/")

    @task(2)
    def get_reservations(self):
        # Ensure the user is authenticated before accessing this endpoint
        response = self.client.post("/api/token", {
            "username": "2021001",
            "password": "123456",
            "grant_type": "password"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            headers = {"Authorization": f"Bearer {token}"}
            self.client.get("/api/reservations/my-reservations", headers=headers)

    @task(3)
    def login(self):
        self.client.post("/api/token", {
            "username": "2021001",
            "password": "123456",
            "grant_type": "password"
        })

class WebsiteUser(HttpUser):
    tasks = [UserBehavior]
    wait_time = between(1, 5)