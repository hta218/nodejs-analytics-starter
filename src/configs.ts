import path from 'path'


export const ssl_key_path = path.resolve(__dirname, process.env.SSL_KEY_PATH)
export const ssl_crt_path = path.resolve(__dirname, process.env.SSL_CRT_PATH)
export const ssl_pem_path = path.resolve(__dirname, process.env.SSL_PEM_PATH)

