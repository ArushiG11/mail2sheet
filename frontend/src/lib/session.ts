export const saveToken = (t: string) => localStorage.setItem("jwt", t);
export const getToken = () => localStorage.getItem("jwt");
export const clearToken = () => localStorage.removeItem("jwt");
