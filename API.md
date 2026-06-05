# AutoERP Pro v2 API Hujjatlari

Bu hujjatda backend tizimi taqdim etadigan asosiy API endpointlar haqida ma'lumot berilgan.

## Asosiy URL
Local muhitda API manzili: `http://localhost:3001/api`

## Autentifikatsiya (Authentication)

### 1. Tizimga Kirish (Login)
- **Endpoint:** `POST /auth/login`
- **Tavsif:** Foydalanuvchini autentifikatsiya qilish va JWT token olish.
- **Rate Limit:** Maksimal 5 marta 15 daqiqa ichida.
- **Request Body:**
  ```json
  {
    "email": "admin@autoerp.uz",
    "password": "admin123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1...",
    "user": {
      "id": "u_admin",
      "name": "Bosh admin",
      "email": "admin@autoerp.uz",
      "role": "Admin",
      "permissions": []
    }
  }
  ```
- **Error Response (400 Bad Request):** `{"error": "Email yoki parol noto'g'ri"}`

### 2. Joriy Foydalanuvchini Olish (Me)
- **Endpoint:** `GET /auth/me`
- **Tavsif:** Tizimga kirgan (token egasi bo'lgan) foydalanuvchi ma'lumotlarini olish.
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
  ```json
  {
    "user": {
      "id": "u_admin",
      "name": "Bosh admin",
      "email": "admin@autoerp.uz",
      "role": "Admin",
      "permissions": []
    }
  }
  ```
- **Error Response (401 Unauthorized):** `{"error": "Kirish taqiqlangan, token topilmadi"}` yoki `{"error": "Yaroqsiz token"}`

## Eslatmalar
- Barcha himoyalangan endpointlarga so'rov yuborishda `Authorization: Bearer <token>` headeri bo'lishi shart.
- Rate Limiter qo'llanilgan, shuning uchun ko'p xato urinishlar ma'lum vaqtga bloklanishi mumkin.
- API qo'shimcha resurslar qo'shilganda (masalan mahsulotlar, savdo va kassa) ushbu hujjat yangilanadi.
