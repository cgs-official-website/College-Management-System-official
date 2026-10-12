import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const folderPath = path.join(__dirname, '..', '..', 'CMS File Format');

if (!fs.existsSync(folderPath)) {
  fs.mkdirSync(folderPath, { recursive: true });
}

// 1. Department Template
const departmentData = [
  {
    Department_Name: "Computer Science",
    Department_Code: "CSE"
  },
  {
    Department_Name: "Mechanical Engineering",
    Department_Code: "MECH"
  }
];

const departmentSheet = XLSX.utils.json_to_sheet(departmentData);
const departmentBook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(departmentBook, departmentSheet, "Departments");
XLSX.writeFile(departmentBook, path.join(folderPath, "Departments_Import_Template.xlsx"));

// 2. Course Template
const courseData = [
  {
    Course_Name: "B.Tech Computer Science",
    Course_Code: "BTECH-CSE",
    Semester: 8,
    Credits: 160,
    Department_Code: "CSE"
  },
  {
    Course_Name: "B.Tech Mechanical",
    Course_Code: "BTECH-MECH",
    Semester: 8,
    Credits: 160,
    Department_Code: "MECH"
  }
];

const courseSheet = XLSX.utils.json_to_sheet(courseData);
const courseBook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(courseBook, courseSheet, "Courses");
XLSX.writeFile(courseBook, path.join(folderPath, "Courses_Import_Template.xlsx"));

// 3. Section Template
const sectionData = [
  {
    Section_Name: "Year 1 - Section A",
    Capacity: 60,
    Course_Code: "BTECH-CSE"
  },
  {
    Section_Name: "Year 1 - Section B",
    Capacity: 60,
    Course_Code: "BTECH-CSE"
  }
];

const sectionSheet = XLSX.utils.json_to_sheet(sectionData);
const sectionBook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(sectionBook, sectionSheet, "Sections");
XLSX.writeFile(sectionBook, path.join(folderPath, "Sections_Import_Template.xlsx"));

console.log('Successfully created Academic Structure Excel templates in CMS File Format folder.');
