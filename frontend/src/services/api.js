import axios from "axios";

const api = axios.create({
  baseURL: "https://aid-tracking.onrender.com"
});

export default api;