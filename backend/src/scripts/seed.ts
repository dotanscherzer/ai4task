import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDatabase } from '../config/database';
import { Question } from '../models/Question';
import { Topic } from '../models/Topic';

dotenv.config();

const defaultQuestions = [
  // נושא 1 – תיאור האתגר והכאב המרכזי
  { topicNumber: 1, questionText: 'איפה בדיוק "כואב" היום בפירוק HLD? (זמן / איכות / עקביות / תלויות / חזרתיות / חוסר בעלות)', isDefault: true },
  { topicNumber: 1, questionText: 'כיצד האתגר מתבטא בשטח? (יותר שאלות? יותר סבבים? עיכובים? Stories לא מספיק "Ready"?)', isDefault: true },
  { topicNumber: 1, questionText: 'למה זה קורה לדעתך? (אין סטנדרט? חוסר זמן? חוסר מידע? שונות בין מדורים?)', isDefault: true },

  // נושא 2 – השפעה עסקית ומיקודים ארגוניים
  { topicNumber: 2, questionText: 'על אילו מיקודים עסקיים האתגר הזה משפיע? (Time-to-Market, עמידה ברגולציה, יציבות, יעילות תפעולית, חוויית לקוח)', isDefault: true },
  { topicNumber: 2, questionText: 'איפה הפגיעה הכי משמעותית היום? (רגולציה / בנקים / מוצר / תשתיות / שינוי רוחבי)', isDefault: true },
  { topicNumber: 2, questionText: 'מה העלות העסקית של "פירוק לא טוב"? (דחיות, קנסות/ציות, פגיעה בהכנסות, עומס תפעולי)', isDefault: true },

  // נושא 3 – קהל יעד, היקף ותלותים
  { topicNumber: 3, questionText: 'מי הצרכן הישיר של הפירוק ל-Epics / Features / Stories? (ארכיטקטים / SA / BA / ראשי צוותים / פיתוח / QA / תשתיות / אבטחת מידע)', isDefault: true },
  { topicNumber: 3, questionText: 'כמה מדורים בממוצע מעורבים בפרויקט טיפוסי? ומה רמת התלויות ביניהם?', isDefault: true },
  { topicNumber: 3, questionText: 'מה התדירות? כמה דרישות בחודש עוברות פירוק מלא ל-Epics / Features / Stories?', isDefault: true },
  { topicNumber: 3, questionText: 'באיזה סוג פרויקטים זה כמעט תמיד הופך לבעייתי? (רוחבי / רב-מערכתי / רגולציה / בנקים)', isDefault: true },
  { topicNumber: 3, questionText: 'איפה צווארי הבקבוק הקבועים בתהליך? (אישורים, אבטחה, DB, אינטגרציות, ספק חיצוני)', isDefault: true },

  // נושא 4 – מדדים (KPI) והשפעה מדידה
  { topicNumber: 4, questionText: 'אילו מדדים נפגעים בפועל? (בחר 1–2): סבבי חזרה בין ארכיטקט / SA / פיתוח, אחוז Stories שמוחזרות בגלל חוסר בהירות, חריגות תכנון ספרינט בגלל תלויות שלא זוהו, תקלות (defects) שמקורן באפיון חסר', isDefault: true },
  { topicNumber: 4, questionText: 'מה יעד השיפור הרצוי במדדים האלו? (למשל: להפחית חזרות ב-30%, לקצר Lead Time ב-20%)', isDefault: true },

  // נושא 5 – מה נחשב הצלחה (ללא קשר ל-AI)
  { topicNumber: 5, questionText: 'אם לא היה AI בכלל – איך נראית הצלחה בעיניך? (מה משתנה ביום-יום?)', isDefault: true },
  { topicNumber: 5, questionText: 'מה Definition of Ready מחייב ל-Epic / Feature / Story אצלכם?', isDefault: true },
  { topicNumber: 5, questionText: 'מה "המינימום המספיק" לפירוק טוב? (אילו פרטים חייבים להיות בכל Story?)', isDefault: true },
  { topicNumber: 5, questionText: 'מה רמת הגרנולריות הרצויה? מתי Epic הופך Feature ומתי Story?', isDefault: true },
  { topicNumber: 5, questionText: 'מי מאשר שה-Backlog "מוכן לפיתוח"? ומה הקריטריונים לאישור?', isDefault: true },

  // נושא 6 – דאטה, כלים ותשתית תומכת
  { topicNumber: 6, questionText: 'באילו כלים אתם מנהלים היום את ה-Backlog? (Jira / ADO וכו\') ומה המבנה הקיים – Epic / Feature / Story', isDefault: true },
  { topicNumber: 6, questionText: 'איפה נשמרים ה-HLDים, האפיונים והחלטות הארכיטקטורה? (Confluence / SharePoint / Docs / Email)', isDefault: true },
  { topicNumber: 6, questionText: 'האם קיימות תבניות רשמיות ל-HLD / handoff / DD? או שכל מדור עובד אחרת?', isDefault: true },
  { topicNumber: 6, questionText: 'איזה "אוצר מילים" חייב להיות אחיד בין כולם? (מדורים, מערכות, דומיינים, שמות שירותים, סוגי אינטגרציות)', isDefault: true },
  { topicNumber: 6, questionText: 'אילו מגבלות מידע קיימות? (רגולציה / PII / חומר מסווג / מה אסור להכניס לכלי AI)', isDefault: true },

  // נושא 7 – מורכבות, סיכונים ושינוי ארגוני
  { topicNumber: 7, questionText: 'האם יש צורך ב-Audit Trail מנומק להחלטות פירוק? (למה זה במדור X, למה זה Story ולא Task)', isDefault: true },
  { topicNumber: 7, questionText: 'האם התהליך לא אחיד בין מדורים? מהם ההבדלים הקריטיים ביותר?', isDefault: true },
  { topicNumber: 7, questionText: 'האם הדרישות משתנות בתדירות גבוהה תוך כדי פירוק (Scope Churn)? מי מאשר שינוי כזה?', isDefault: true },
  { topicNumber: 7, questionText: 'האם יש תלות בגורמים חיצוניים שמקשה על פירוק מראש? (בנק / רגולטור / ספק)', isDefault: true },
  { topicNumber: 7, questionText: 'האם קיימת התנגדות תרבותית או תחושת "בעלות אישית" על הפירוק? מי ה-Sponsor העסקי / הטכנולוגי?', isDefault: true },

  // נושא 8 – Best Practices וצעדי המשך
  { topicNumber: 8, questionText: 'אילו Best Practices פנימיים היית רוצה להפוך לסטנדרט ארגוני?', isDefault: true },
  { topicNumber: 8, questionText: 'האם ניתן להתחיל בפיילוט ממוקד? באיזה דומיין / מדור ROI יהיה הכי גבוה?', isDefault: true },
  { topicNumber: 8, questionText: 'האם נדרשת תבנית אחת אחידה ל-Epic / Feature / Story (כולל DoR / DoD / Acceptance Criteria)?', isDefault: true },
  { topicNumber: 8, questionText: 'האם נדרש Workflow של Review / Approval לפירוק לפני handoff ל-DD? מי הגורם המאשר?', isDefault: true },
  { topicNumber: 8, questionText: 'אילו תוצרים חייבים לצאת מהפירוק כדי שכל הגורמים יבטחו בו?', isDefault: true },
];

const topics = [
  { 
    number: 1, 
    label: 'תיאור האתגר והכאב המרכזי',
    description: 'שאלות על איפה בדיוק "כואב" בפירוק HLD, איך האתגר מתבטא בשטח ולמה זה קורה'
  },
  { 
    number: 2, 
    label: 'השפעה עסקית ומיקודים ארגוניים',
    description: 'שאלות על מיקודים עסקיים שנפגעים, הפגיעות המשמעותיות והעלות העסקית של פירוק לא טוב'
  },
  { 
    number: 3, 
    label: 'קהל יעד, היקף ותלותים',
    description: 'שאלות על צרכני הפירוק, היקף המדורים, תדירות, סוגי פרויקטים בעייתיים וצווארי בקבוק'
  },
  { 
    number: 4, 
    label: 'מדדים (KPI) והשפעה מדידה',
    description: 'שאלות על מדדים שנפגעים בפועל ויעדי השיפור הרצויים'
  },
  { 
    number: 5, 
    label: 'מה נחשב הצלחה (ללא קשר ל-AI)',
    description: 'שאלות על Definition of Ready, המינימום המספיק, גרנולריות וקריטריוני אישור'
  },
  { 
    number: 6, 
    label: 'דאטה, כלים ותשתית תומכת',
    description: 'שאלות על כלי Backlog, שמירת HLD, תבניות, אוצר מילים אחיד ומגבלות מידע'
  },
  { 
    number: 7, 
    label: 'מורכבות, סיכונים ושינוי ארגוני',
    description: 'שאלות על Audit Trail, אחידות בין מדורים, Scope Churn, תלויות חיצוניות והתנגדות ארגונית'
  },
  { 
    number: 8, 
    label: 'Best Practices וצעדי המשך',
    description: 'שאלות על Best Practices, פיילוט, תבניות אחידות, Workflow של Review/Approval ותוצרים נדרשים'
  },
];

async function seed() {
  try {
    await connectDatabase();

    // Seed topics (upsert to avoid duplicates)
    for (const topic of topics) {
      await Topic.findOneAndUpdate(
        { number: topic.number },
        { $set: topic },
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Seeded ${topics.length} topics`);

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

