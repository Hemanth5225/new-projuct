const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "expenseTracker.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Server Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// Helper function to convert database object to response object
const convertDBObjectToResponseObject = (dbObject) => {
  return {
    transactionId: dbObject.transaction_id,
    title: dbObject.title,
    amount: dbObject.amount,
    type: dbObject.type, // income or expense
    category: dbObject.category,
    date: dbObject.date,
  };
};

// POST /transactions - Add a new transaction (income or expense)
app.post("/transactions/", async (request, response) => {
  const { title, amount, type, category, date } = request.body;
  const addTransactionQuery = `
    INSERT INTO 
      transactions (title, amount, type, category, date)
    VALUES 
      ('${title}', ${amount}, '${type}', '${category}', '${date}');`;
  await db.run(addTransactionQuery);
  response.send("Transaction Added Successfully");
});

// GET /transactions - Retrieve all transactions
app.get("/transactions/", async (request, response) => {
  const getAllTransactionsQuery = `
    SELECT * 
    FROM 
      transactions;`;
  const transactionsArray = await db.all(getAllTransactionsQuery);
  response.send(
    transactionsArray.map((transaction) =>
      convertDBObjectToResponseObject(transaction)
    )
  );
});

// GET /transactions/:id - Retrieve a specific transaction by ID
app.get("/transactions/:id/", async (request, response) => {
  const { id } = request.params;
  const getTransactionQuery = `
    SELECT * 
    FROM 
      transactions 
    WHERE 
      transaction_id = ${id};`;
  const transaction = await db.get(getTransactionQuery);
  response.send(convertDBObjectToResponseObject(transaction));
});

// PUT /transactions/:id - Update a transaction by ID
app.put("/transactions/:id/", async (request, response) => {
  const { id } = request.params;
  const { title, amount, type, category, date } = request.body;
  const updateTransactionQuery = `
    UPDATE 
      transactions 
    SET 
      title = '${title}', 
      amount = ${amount}, 
      type = '${type}', 
      category = '${category}', 
      date = '${date}'
    WHERE 
      transaction_id = ${id};`;
  await db.run(updateTransactionQuery);
  response.send("Transaction Updated Successfully");
});

// DELETE /transactions/:id - Delete a transaction by ID
app.delete("/transactions/:id/", async (request, response) => {
  const { id } = request.params;
  const deleteTransactionQuery = `
    DELETE FROM 
      transactions 
    WHERE 
      transaction_id = ${id};`;
  await db.run(deleteTransactionQuery);
  response.send("Transaction Deleted Successfully");
});

// GET /summary - Retrieve a summary of transactions (total income, total expenses, balance)
// Optional filters by date range or category
app.get("/summary/", async (request, response) => {
  const { startDate, endDate, category } = request.query;

  let filterQuery = "";
  if (startDate && endDate) {
    filterQuery += ` AND date BETWEEN '${startDate}' AND '${endDate}'`;
  }
  if (category) {
    filterQuery += ` AND category = '${category}'`;
  }

  const summaryQuery = `
    SELECT 
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS totalIncome,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS totalExpense
    FROM 
      transactions
    WHERE 
      1=1 ${filterQuery};`;

  const summary = await db.get(summaryQuery);

  const balance = summary.totalIncome - summary.totalExpense;

  response.send({
    totalIncome: summary.totalIncome,
    totalExpense: summary.totalExpense,
    balance: balance,
  });
});

module.exports = app;
