import axios from "axios";


const API_URL = process.env.NEXT_PUBLIC_API_URL
const API_VERSION = process.env.NEXT_PUBLIC_API_URL_VERSION

if(!API_URL || !API_VERSION) {
    throw new Error("not found NEXT_PUBLIC_API_URL")
}

export const apiClient = axios.create({
    baseURL: `${API_URL}/${API_VERSION}`,
    withCredentials: true
})