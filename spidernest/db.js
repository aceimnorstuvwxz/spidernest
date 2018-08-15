// (C) 2018 netqon.com all rights reserved.

const sqlite3 = require('sqlite3').verbose()
const electron = require('electron')
const Store = require('electron-store')
const store = new Store()
const path = require('path')
const utils = require('./utils')
const uuidgen = require('uuid/v4');

let g_db = null

let g_solution_sql = `
CREATE TABLE if not exists "solution" (
  "id" text primary key,
  "name" text,
  "desc" text,
  "doc" text,
  "web" text,
  "version" text,
  "config" text,
  "state" integer,
  "extra" text,
  "head" text,
  "data" text,
  "count" integer,
  "date" integer
);`

let g_module_sql = `
CREATE TABLE if not exists "module" (
  "id" text primary key,
  "solution_id" text,
  "name" text,
  "doc" text,
  "config" text,
  "codeout" text,
  "codein" text,
  "extra" text,
  "count" integer,
  "state" integer,
  "date" integer,
  "data" text
);`

// let g_module_index_sql = `CREATE INDEX "main"."module-number"
// ON "module" (
//   "number" COLLATE BINARY DESC
// );`
// let g_module_index_sql2 = `CREATE INDEX "main"."module-time"
// ON "module" (
//   "time" COLLATE BINARY DESC
// );`

exports.database_init = () => {
    store.set('dbversion', '1')

    g_db = new sqlite3.Database(utils.data_file('spidernest.txt'))

    g_db.serialize(function () {
        g_db.run(g_solution_sql)
        g_db.run(g_module_sql)
    })

    if (!store.get('db_inited', false)) {
        g_db.serialize(function () {
            // g_db.run(g_module_index_sql)
            // g_db.run(g_module_index_sql2)
        })

        console.log('database inited')
        store.set('db_inited', true)
    }

}

exports.db_get_all_solutions = (cb, order = false) => {
    g_db.serialize(function () {

        let sql = `SELECT  *  FROM solution ${order ? 'ORDER BY date DESC' : ''}`;

        g_db.all(sql, (err, rows) => {
            if (err) {
                throw err;
            }
            if (cb) {
                cb(rows)
            }
        })
    })
}

exports.db_get_solution_by_id = (solution_id, cb) => {
    g_db.serialize(function () {
        let sql = `SELECT  * FROM solution WHERE id=?`;

        g_db.all(sql, [solution_id], (err, rows) => {
            if (err) {
                throw err;
            }

            if (rows.length != 1) {
                console.error('ERROR not find solution', solution_id)
            } else {
                if (cb) {
                    cb(rows[0])
                }
            }

        })
    })
}

exports.db_remove_solution = (solution_id) => {
    g_db.serialize(function () {
        g_db.run(`DELETE FROM solutin WHERE id=?`,
            [solution_id], function (err) {
                if (err) {
                    return console.log(err.message)
                }
                console.log(`A row has been deleted with rowid ${this.lastID}`)
            })
    })
}


exports.db_save_new_solution = (new_solution) => {

    g_db.serialize(function () {
        g_db.run(`INSERT INTO solution(id, name, desc, doc, web, version, config, state, extra, head, data, count, date) 
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            new_solution.id, new_solution.name, new_solution.desc, new_solution.doc, new_solution.web,
            new_solution.version, new_solution.config, new_solution.state, new_solution.extra, new_solution.head,
            new_solution.data, new_solution.count, new_solution.date, function (err) {
                if (err) {
                    return console.log(err.message)
                }
                console.log(`A row has been inserted with rowid ${this.lastID}`)
            })
    })
}

exports.db_update_solution = (solution) => {
    g_db.serialize(function () {
        g_db.run(`UPDATE solution set name=？, desc=？, doc=？, web=？, version=？, config=？, 
        state=？, extra=？, head=？, data=？, count=？, date=？ WHERE id=?`,
            [solution.name, solution.desc, solution.doc, solution.web, solution.version, solution.config,
                solution.state, solution.extra, solution.head, solution.data, solution.count, solution.date, solution.id], function (err) {
                if (err) {
                    return console.log(err.message)
                }
                console.log(`A row has been updated with rowid ${this.lastID}`)
            })
    })
}

exports.db_save_new_module = (new_module) => {

    g_db.serialize(function () {
        g_db.run(`INSERT INTO module(id, solution_id, name, doc, config, codeout, codein, extra, count, state, date, data)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            new_module.id, new_module.solution_id, new_module.name, new_module.doc, new_module.config,
            new_module.codeout, new_module.codein, new_module.extra, new_module.count, new_module.state, new_module.date, new_module.data,
            function (err) {
                if (err) {
                    return console.error(err.message);
                }
                console.log(`A row has been inserted with rowid ${this.lastID}`);
            });
    })
}

exports.db_update_module = (module) => {

    g_db.serialize(function () {
        g_db.run(`UPDATE module SET solution_id=?, name=?, doc=?, config=?, codeout=?, codein=?, extra=?, count=?, state=?, date=?, data=?
         WHERE id=?`,module.solution_id, module.name, module.doc, module.config,
            module.codeout, module.codein, module.extra, module.count, module.state, module.date, module.data, module.id,
            function (err) {
                if (err) {
                    return console.error(err.message);
                }
                console.log(`A row has been updated with rowid ${this.lastID}`);
            });
    })
}

exports.db_delete_modules = (solution_id) => {
    g_db.serialize(function () {
        g_db.run(`DELETE FROM module WHERE solution_id=?`, [solution_id],
            function (err) {
                if (err) {
                    return console.error(err.message);
                }
            })
    })
}

exports.db_delete_module = (module_id) => {
    g_db.serialize(function () {
        g_db.run(`DELETE FROM module WHERE id=?`, [module_id],
            function (err) {
                if (err) {
                    return console.error(err.message);
                }
            })
    })
}

exports.db_get_all_modules = (solution_id, cb) => {
    g_db.serialize(function () {
        let sql = `SELECT  * FROM module WHERE  solution_id=? ORDER BY date DESC `;

        g_db.all(sql, [solution_id], (err, rows) => {
            if (err) {
                throw err;
            }
            if (cb) {
                cb(rows)
            }
        })
    })
}

exports.db_get_module = (module_id, cb) => {
    g_db.serialize(function () {
        let sql = `SELECT  * FROM module WHERE id=? `;
        g_db.all(sql, [module_id], (err, rows) => {
            if (err) {
                throw err;
            }
            if (cb) {
                if (rows && rows.length > 0) {
                    cb(rows[0])
                }
            }
        })
    })
}

exports.db_get_last_module = (solution_id, cb) => {
    g_db.serialize(function () { //, added, deleted, diff not needed
        let sql = `SELECT  * FROM module WHERE solution_id=? ORDER BY date DESC LIMIT 1`;
        g_db.all(sql, [solution_id], (err, rows) => {
            if (err) {
                throw err;
            }
            if (cb) {
                cb(rows)
            }
        })
    })
}
