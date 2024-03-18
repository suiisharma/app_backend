// Imports
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");

const pgp = require("pg-promise")();
const createTable = require("./models/index.js");
const logger = require("./logger/logging.config.js");

// Env Configurations
dotenv.config();

const port = process.env.port || 3000;

// Express Application Creation
const app = express();

// Json Parsing middleware
app.use(express.json());

// cors
app.use(cors());

let db;
const connectDB = async () => {
  try {
    db = pgp(process.env.db_url);
    logger.info("Connected to database successfully!");
    await createTable(db);
    return db;
  } catch (error) {
    logger.error(`Error in connecting to database:${error.message}`);
  }
};

connectDB();

const sendSubmisssionToVjudge0 = async (languageId, source_code, stdin) => {
  try {
    const options = {
      method: "POST",
      url: "https://judge0-ce.p.rapidapi.com/submissions",
      params: {
        base64_encoded: "true",
        fields: "*",
      },
      headers: {
        "content-type": "application/json",
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
        "X-RapidAPI-Host": process.env.RAPIDAPI_HOST,
      },
      data: {
        language_id: languageId,
        source_code: Buffer.from(source_code).toString("base64"),
        stdin: Buffer.from(stdin).toString("base64"),
      },
    };

    const response = await axios.request(options);
    return response.data?.token;
  } catch (error) {
    logger.error(error.message);
    throw error;
  }
};

const getResult = async (token) => {
  const options = {
    method: "GET",
    url: `https://judge0-ce.p.rapidapi.com/submissions/${token}`,
    params: {
      base64_encoded: "true",
      fields: "*",
    },
    headers: {
      "X-RapidAPI-Key":process.env.RAPIDAPI_KEY,
      "X-RapidAPI-Host": process.env.RAPIDAPI_HOST,
    },
  };

  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    logger.error(error);
    throw error;
  }
};

app.post("/submit", async (req, res) => {
  try {
    const { username, language, source_code, stdin } = req.body;

    const languageId = getLanguageId(language);
    if (languageId === null) {
      return res.status(400).json({ message: "Invalid language" });
    }
    const token = await sendSubmisssionToVjudge0(
      languageId,
      source_code,
      stdin
    );
    const result = await getResult(token);
    let stdout=result.stdout;
    if(stdout!=null){
      stdout = Buffer.from(stdout, "base64").toString("utf-8");
    }
    let stderr = result.stderr;
    if(stderr!=null){
      stderr=Buffer.from(stderr, "base64").toString("utf-8");
    }

    const insertSql = `INSERT INTO code_submissions (username, languages, stdin, source_code, output, stderr) VALUES ($1, $2, $3, $4, $5, $6)`;
    await db.none(insertSql, [
      username,
      language,
      stdin,
      source_code,
      stdout,
      stderr,
    ]);
    res
      .status(200)
      .json({
        message: "Submitted successfully",
        result: { source_code, stdin, stderr, stdout },
      });
  } catch (error) {
    logger.error(error.message);
    res.status(400).json({ message: `Error: ${error.message}` });
  }
});

// Get language code
const getLanguageId = (language) => {
  const languages = [
    { id: 45, name: "Assembly (NASM 2.14.02)" },
    { id: 46, name: "Bash (5.0.0)" },
    { id: 47, name: "Basic (FBC 1.07.1)" },
    { id: 75, name: "C (Clang 7.0.1)" },
    { id: 76, name: "C++ (Clang 7.0.1)" },
    { id: 48, name: "C (GCC 7.4.0)" },
    { id: 52, name: "C++ (GCC 7.4.0)" },
    { id: 49, name: "C (GCC 8.3.0)" },
    { id: 53, name: "C++ (GCC 8.3.0)" },
    { id: 50, name: "C (GCC 9.2.0)" },
    { id: 54, name: "C++ (GCC 9.2.0)" },
    { id: 86, name: "Clojure (1.10.1)" },
    { id: 51, name: "C# (Mono 6.6.0.161)" },
    { id: 77, name: "COBOL (GnuCOBOL 2.2)" },
    { id: 55, name: "Common Lisp (SBCL 2.0.0)" },
    { id: 90, name: "Dart (2.19.2)" },
    { id: 56, name: "D (DMD 2.089.1)" },
    { id: 57, name: "Elixir (1.9.4)" },
    { id: 58, name: "Erlang (OTP 22.2)" },
    { id: 44, name: "Executable" },
    { id: 87, name: "F# (.NET Core SDK 3.1.202)" },
    { id: 59, name: "Fortran (GFortran 9.2.0)" },
    { id: 60, name: "Go (1.13.5)" },
    { id: 95, name: "Go (1.18.5)" },
    { id: 88, name: "Groovy (3.0.3)" },
    { id: 61, name: "Haskell (GHC 8.8.1)" },
    { id: 91, name: "Java (JDK 17.0.6)" },
    { id: 62, name: "Java (OpenJDK 13.0.1)" },
    { id: 63, name: "JavaScript (Node.js 12.14.0)" },
    { id: 93, name: "JavaScript (Node.js 18.15.0)" },
    { id: 78, name: "Kotlin (1.3.70)" },
    { id: 64, name: "Lua (5.3.5)" },
    { id: 89, name: "Multi-file program" },
    { id: 79, name: "Objective-C (Clang 7.0.1)" },
    { id: 65, name: "OCaml (4.09.0)" },
    { id: 66, name: "Octave (5.1.0)" },
    { id: 67, name: "Pascal (FPC 3.0.4)" },
    { id: 85, name: "Perl (5.28.1)" },
    { id: 68, name: "PHP (7.4.1)" },
    { id: 43, name: "Plain Text" },
    { id: 69, name: "Prolog (GNU Prolog 1.4.5)" },
    { id: 70, name: "Python (2.7.17)" },
    { id: 92, name: "Python (3.11.2)" },
    { id: 71, name: "Python (3.8.1)" },
    { id: 80, name: "R (4.0.0)" },
    { id: 72, name: "Ruby (2.7.0)" },
    { id: 73, name: "Rust (1.40.0)" },
    { id: 81, name: "Scala (2.13.2)" },
    { id: 82, name: "SQL (SQLite 3.27.2)" },
    { id: 83, name: "Swift (5.2.3)" },
    { id: 74, name: "TypeScript (3.7.4)" },
    { id: 94, name: "TypeScript (5.0.3)" },
    { id: 84, name: "Visual Basic.Net (vbnc 0.0.0.5943)" },
  ];

  const languageObject = languages.find((lang) => lang.name === language);
  return languageObject ? languageObject.id : null;
};

app.get("/submissions", async (req, res) => {
  try {
    const fetchSql = `SELECT * FROM code_submissions`;
    const result = await db.any(fetchSql);
    res.status(200).json({ result });
  } catch (error) {
    logger.error(error.message);
    res.status(400).json({ message: `Error: ${error.message}` });
  }
});

app.listen(port, () => {
  logger.info(`Server started at port ${port}`);
});
