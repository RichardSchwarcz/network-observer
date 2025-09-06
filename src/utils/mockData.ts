import { NetworkRequest } from "@/types";

export const generateMockRequests = (): NetworkRequest[] => {
  const baseTime = Date.now() - 300000; // 5 minutes ago

  return [
    {
      id: "mock-1",
      url: "https://api.github.com/user/repos",
      method: "GET",
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": "Bearer ghp_xxxxxxxxxxxxxxxxxxxxx",
        "User-Agent": "MyApp/1.0.0"
      },
      timestamp: baseTime + 1000,
      duration: 245,
      response: {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-RateLimit-Limit": "5000",
          "X-RateLimit-Remaining": "4999"
        },
        body: JSON.stringify([
          {
            id: 123456,
            name: "awesome-project",
            full_name: "user/awesome-project",
            private: false,
            html_url: "https://github.com/user/awesome-project"
          }
        ], null, 2)
      }
    },
    {
      id: "mock-2",
      url: "https://api.stripe.com/v1/payment_intents",
      method: "POST",
      headers: {
        "Authorization": "Bearer sk_test_xxxxxxxxxxxxxxxxxxxxx",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "amount=2000&currency=usd&payment_method=pm_1234567890",
      timestamp: baseTime + 15000,
      duration: 156,
      response: {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Request-Id": "req_abc123def456"
        },
        body: JSON.stringify({
          id: "pi_1234567890abcdef",
          object: "payment_intent",
          amount: 2000,
          currency: "usd",
          status: "requires_payment_method"
        }, null, 2)
      }
    },
    {
      id: "mock-3",
      url: "https://jsonplaceholder.typicode.com/posts/1",
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
      timestamp: baseTime + 32000,
      duration: 89,
      response: {
        status: 404,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          error: "Post not found",
          message: "The requested post does not exist"
        }, null, 2)
      }
    },
    {
      id: "mock-4",
      url: "https://api.openweather.org/data/2.5/weather?q=London&appid=abc123",
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
      timestamp: baseTime + 45000,
      duration: 234,
      response: {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          coord: { lon: -0.1257, lat: 51.5085 },
          weather: [
            { main: "Clouds", description: "overcast clouds" }
          ],
          main: {
            temp: 15.32,
            feels_like: 14.87,
            humidity: 82
          },
          name: "London"
        }, null, 2)
      }
    },
    {
      id: "mock-5",
      url: "https://httpbin.org/delay/2",
      method: "GET",
      headers: {},
      timestamp: baseTime + 60000,
      duration: 2156,
      response: {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          args: {},
          headers: {
            "Host": "httpbin.org",
            "User-Agent": "curl/7.68.0"
          },
          origin: "127.0.0.1",
          url: "https://httpbin.org/delay/2"
        }, null, 2)
      }
    }
  ];
};
