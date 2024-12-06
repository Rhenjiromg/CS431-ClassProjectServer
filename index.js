const express = require('express');
const app = express();
const port = 3001;
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

app.use(cors({ origin: 'http://localhost:3000'}));
app.use(express.json());

const db = mysql.createConnection({
    host: '127.0.0.1',  
    user: 'root',       
    password: '',  
    database: 'my_database' 
});

app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    init();
});

app.post('/run-query', (req, res) => {
    console.log(new Date());
    const { query } = req.body; 
    db.execute(query,(err, results) => {
        if (err) {
            console.log(err)
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

const init = async() => {
    console.log('init')
    const jsonFilePath = path.join(__dirname, 'schema.json');
    fs.readFile(jsonFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading JSON file:', err);
            return res.status(500).json({ error: 'Failed to read schema.json' });
        }

        try {
            const schema = JSON.parse(data);
            schema.tables.forEach(table => {
                const dropTableQuery = `DROP TABLE IF EXISTS ${table.name};`;
                db.execute(dropTableQuery, (err) => {
                    if (err) {
                        console.error(`Error dropping table ${table.name}:`, err);
                    } else {
                        console.log(`Table ${table.name} dropped successfully.`);
                    }
                });
            });
            schema.tables.forEach(table => {
                const fields = Object.entries(table.fields)
                    .map(([field, definition]) => `${field} ${definition}`)
                    .join(', ');
                const createTableQuery = `CREATE TABLE IF NOT EXISTS ${table.name} (${fields});`;

                db.execute(createTableQuery, (err) => {
                    if (err) {
                        console.error(`Error creating table ${table.name}:`, err);
                    } else {
                        console.log(`Table ${table.name} created successfully.`);
                    }
                });
                if (table.data && table.data.length > 0) {
                    const columns = Object.keys(table.data[0]).join(', ');
                    const values = table.data
                        .map(row => `(${Object.values(row).map(value => `'${value}'`).join(', ')})`)
                        .join(', ');
                    const insertDataQuery = `INSERT INTO ${table.name} (${columns}) VALUES ${values};`;

                    db.execute(insertDataQuery, (err) => {
                        if (err) {
                            console.error(`Error inserting data into table ${table.name}:`, err);
                        } else {
                            console.log(`Data inserted into table ${table.name} successfully.`);
                        }
                    });
                }
            });
            console.log('success');
        } catch (parseErr) {
            console.error('Error parsing JSON file:', parseErr);
        }
    });
};
