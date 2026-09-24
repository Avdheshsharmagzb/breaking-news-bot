import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const mediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BACKEND_URL}${path}`;
};

export const timeAgo = (iso, lang = "hi") => {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const mins = Math.floor(diff / 60);
  const hrs = Math.floor(diff / 3600);
  if (lang === "en") {
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    if (hrs < 24) return `${hrs} hr ago`;
    return `${Math.floor(hrs / 24)} d ago`;
  }
  if (mins < 1) return "अभी";
  if (mins < 60) return `${mins} मिनट पहले`;
  if (hrs < 24) return `${hrs} घंटे पहले`;
  return `${Math.floor(hrs / 24)} दिन पहले`;
};
