import axios from "axios"
// const baseURL = "http://localhost:8006/api"
const baseURL = "https://cpm-back.onrender.com/api"

export  const api = axios.create({
    baseURL
})
