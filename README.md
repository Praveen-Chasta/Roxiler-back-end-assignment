1). Create an API to initialize the database:

Fetch the JSON data from the third-party API.
Use the fetched data to seed the database with product transaction records.

2). Create an API for statistics:

Calculate and return the total sale amount of products sold in the selected month.
Calculate and return the total number of products sold and not sold in the selected month.

3). Create an API for a bar chart:

Generate a bar chart showing the number of products falling in different price ranges for the selected month.
The price ranges are predefined, such as 0-100, 101-200, etc.

4). Create an API for a pie chart:

Generate a pie chart showing the unique categories of products and the number of items from each category for the selected month.

5). Create an API that fetches data from the three APIs mentioned above and combines the responses to provide a comprehensive report on product transactions for the selected month.

app.get("/transactions", async (req, res) => {
try {
const { search = "", page = 1, perPage = 10 } = req.query;

    const offset = (page - 1) * perPage;

    let searchCondition = "";
    if (search) {
      searchCondition = `
        WHERE title LIKE '%${search}%' OR
              description LIKE '%${search}%' OR
              price LIKE '%${search}%'
      `;
    }

    const query = `
      SELECT * FROM transactionTable
      ${searchCondition}
      ORDER BY id
      LIMIT ${perPage} OFFSET ${offset}
    `;

    const transactions = await database.all(query);

    res.json(transactions);

} catch (error) {
console.error(`List Transactions Error: ${error.message}`);
res.status(500).json({ error: "Internal Server Error" });
}
});
