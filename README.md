# AI Interview Bot

אפליקציית Web לראיון מנהלים חכם עם AI, המאפשרת איסוף מידע מובנה למפת אתגר בנושא פירוק HLD ל-Epics/Features/Stories.

## ארכיטקטורה

- **Frontend**: React + TypeScript + Vite (פריסה ב-Netlify)
- **Backend**: Node.js + Express + TypeScript (פריסה ב-Render)
- **Database**: MongoDB Atlas
- **AI**: Google Gemini (Gemini 1.5 Flash)
- **Email**: Resend

## התקנה והרצה מקומית

### Backend

```bash
cd backend
npm install
cp .env.example .env
# ערוך את .env והוסף את ה-API keys
npm run dev
```

השרת ירוץ על `http://localhost:3000`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# ערוך את .env והוסף את כתובת ה-API
npm run dev
```

האפליקציה תרוץ על `http://localhost:5173`

### Seed Database

```bash
cd backend
npm run seed
```

זה יוסיף את השאלות הברירת מחדל למסד הנתונים.

## Environment Variables

### Backend (.env)

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/interview-bot
JWT_SECRET=your-secret-key-here
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-pro
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=Challenge Bot <noreply@yourdomain.com>
ADMIN_EMAIL=dotan.scherzer@gmail.com
PORT=3000
NODE_ENV=development
```

### Frontend (.env)

```
VITE_API_URL=http://localhost:3000
```

## פריסה

### Render (Backend)

1. צור Web Service חדש ב-Render
2. חבר את ה-repository
3. הגדר את Environment Variables
4. הגדר Build Command: `npm install && npm run build`
5. הגדר Start Command: `npm start`

### Netlify (Frontend)

1. צור Site חדש ב-Netlify
2. חבר את ה-repository
3. הגדר Build Command: `cd frontend && npm install && npm run build`
4. הגדר Publish Directory: `frontend/dist`
5. הוסף Environment Variable: `VITE_API_URL` עם כתובת ה-API ב-Render

### MongoDB Atlas

1. צור Cluster חדש ב-MongoDB Atlas
2. קבל את ה-Connection String
3. הוסף אותו ל-`MONGODB_URI` ב-Render

## שימוש

### Admin

1. היכנס ל-`/admin` (או `/login` אם לא מחובר)
2. צור ריאיון חדש עם פרטי המנהל ונושאים
3. העתק את הלינק ושלח למנהל
4. צפה בתשובות בזמן אמת
5. שלח מייל סיכום בסיום הריאיון

### Manager

1. פתח את הלינק שקיבלת (`/i/{share_token}`)
2. ענה על השאלות בצ'אט
3. השתמש בכפתורי Quick Actions (דלג/לא יודע/עצור)
4. סיים את הריאיון כשתהיה מוכן

## API Endpoints

### Auth
- `POST /api/auth/register` - הרשמה
- `POST /api/auth/login` - התחברות
- `GET /api/auth/me` - פרטי משתמש נוכחי

### Interviews
- `GET /api/interviews` - רשימת ראיונות
- `POST /api/interviews` - יצירת ריאיון חדש
- `GET /api/interviews/:id` - פרטי ריאיון

### Manager
- `POST /api/manager/state` - קבלת מצב ריאיון
- `POST /api/manager/message` - שליחת הודעה
- `POST /api/manager/complete` - השלמת ריאיון

### Email
- `POST /api/email/send` - שליחת מייל סיכום

## מבנה הפרויקט

```
interview-bot/
├── backend/
│   ├── src/
│   │   ├── models/          # MongoDB schemas
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── middleware/       # Auth & error handling
│   │   └── server.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/      # Reusable components
│   │   ├── services/        # API client
│   │   └── context/         # React context
│   └── package.json
└── README.md
```

## תכונות

- ✅ צ'אט AI חכם עם Google Gemini
- ✅ ניהול ראיונות מלא
- ✅ שליחת מייל סיכום
- ✅ תמיכה מלאה ב-RTL
- ✅ Resume capability (המשך מהנקודה האחרונה)
- ✅ Fallback mode (שאלות סטטיות אם AI לא זמין)

## רישיון

ISC

