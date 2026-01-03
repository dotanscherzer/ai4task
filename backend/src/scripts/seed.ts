import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDatabase } from '../config/database';
import { Question } from '../models/Question';

dotenv.config();

const defaultQuestions = [
  // Topic 1: Understanding HLD Structure
  { topicNumber: 1, questionText: 'איך אתה מגדיר HLD בפרויקט שלך?', isDefault: true },
  { topicNumber: 1, questionText: 'מה המבנה הטיפוסי של HLD שאתה רואה?', isDefault: true },
  { topicNumber: 1, questionText: 'אילו רכיבים עיקריים כולל HLD?', isDefault: true },

  // Topic 2: Epic Definition
  { topicNumber: 2, questionText: 'איך אתה מגדיר Epic?', isDefault: true },
  { topicNumber: 2, questionText: 'מה הקריטריונים להגדרת Epic חדש?', isDefault: true },
  { topicNumber: 2, questionText: 'כמה Epics בדרך כלל יש בפרויקט?', isDefault: true },

  // Topic 3: Feature Breakdown
  { topicNumber: 3, questionText: 'איך אתה מפרק Epic ל-Features?', isDefault: true },
  { topicNumber: 3, questionText: 'מה הגודל הטיפוסי של Feature?', isDefault: true },
  { topicNumber: 3, questionText: 'איך אתה מחליט כמה Features צריך ל-Epic?', isDefault: true },

  // Topic 4: Story Creation
  { topicNumber: 4, questionText: 'איך אתה יוצר Stories מ-Features?', isDefault: true },
  { topicNumber: 4, questionText: 'מה הקריטריונים ל-Story טוב?', isDefault: true },
  { topicNumber: 4, questionText: 'כמה Stories בדרך כלל יש ב-Feature?', isDefault: true },

  // Topic 5: Consistency Across Teams
  { topicNumber: 5, questionText: 'איך אתה מוודא עקביות בין מדורים שונים?', isDefault: true },
  { topicNumber: 5, questionText: 'מה האתגרים בשמירה על עקביות?', isDefault: true },
  { topicNumber: 5, questionText: 'אילו כלים או תהליכים עוזרים לשמירה על עקביות?', isDefault: true },

  // Topic 6: Estimation and Planning
  { topicNumber: 6, questionText: 'איך אתה מעריך Epics ו-Features?', isDefault: true },
  { topicNumber: 6, questionText: 'מה התהליך של תכנון עבודה מ-HLD?', isDefault: true },
  { topicNumber: 6, questionText: 'איך אתה מתמודד עם אי-ודאות בתכנון?', isDefault: true },

  // Topic 7: Dependencies and Risks
  { topicNumber: 7, questionText: 'איך אתה מטפל בתלויות בין Epics/Features?', isDefault: true },
  { topicNumber: 7, questionText: 'מה הסיכונים העיקריים בפירוק HLD?', isDefault: true },
  { topicNumber: 7, questionText: 'איך אתה מזהה ומנהל סיכונים?', isDefault: true },

  // Topic 8: Tools and Processes
  { topicNumber: 8, questionText: 'אילו כלים אתה משתמש לפירוק HLD?', isDefault: true },
  { topicNumber: 8, questionText: 'מה התהליך שלך מ-HLD עד Stories?', isDefault: true },
  { topicNumber: 8, questionText: 'איך אתה מתעד את התהליך?', isDefault: true },
];

async function seed() {
  try {
    await connectDatabase();

    // Clear existing questions
    await Question.deleteMany({});

    // Insert default questions
    await Question.insertMany(defaultQuestions);

    console.log(`✅ Seeded ${defaultQuestions.length} questions`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seed();

