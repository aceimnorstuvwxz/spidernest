const sqlite3 = require('sqlite3').verbose()
const electron = require('electron')
const Store = require('electron-store')
const store = new Store()
const path = require('path')
const utils = require('./utils')
const main_utils = require('./main_utils')
let g_db = null


let g_record_sql = `
CREATE TABLE if not exists "record" (
    "id" integer PRIMARY KEY,
    "domain" text,
    "frame_cssers" text,
    "hidden_cssers" text,
    "inject_css" text,
    "test_url" text,
    "date" integer,
    "extra" text
);`
//integer primary key 就是自增的

let g_index_sqls = []

exports.database_init = () => {
    store.set('dbversion', '1')

    g_db = new sqlite3.Database(path.join(utils.get_userData(), "irreader-readmode-editor.db"))

    g_db.serialize(function () {
        g_db.run(g_record_sql)
    })

    if (!store.get('db_inited', false)) {
        g_db.serialize(function () {
            g_index_sqls.forEach((sql) => {
                g_db.run(sql)

            })
        })
        console.log('database inited')
        store.set('db_inited', true)
    }

}

exports.save_record = (record, cb) => {

    g_db.serialize(function () {
        g_db.run(`INSERT INTO record(domain, frame_cssers, hidden_cssers, inject_css, test_url, date, extra) VALUES(?, ?, ?, ?, ?, ?, ?)`,
            record.domain, record.frame_cssers, record.hidden_cssers, record.inject_css, record.test_url, record.date, record.extra,
            function (err){
                //不能用=>，否则this失效
                //https://stackoverflow.com/questions/28798330/arrow-functions-and-this
                if (err) {
                    throw err
                } else {
                    console.log(`A row has been add with rowid ${this.lastID}`)
                    if (cb) {
                        record.id = this.lastID
                        cb(record)
                    }
                }

            })
    })
}


exports.update_record = (record, cb) => {
    g_db.serialize(function () {
        g_db.run(`UPDATE record SET domain=?, frame_cssers=?, hidden_cssers=?, inject_css=?, test_url=?, date=?, extra=? WHERE id=?`,
            [record.domain, record.frame_cssers, record.hidden_cssers, record.inject_css, record.test_url, record.date, record.extra, record.id],
            function (err) {
                if (err) {
                    throw err
                } else if (cb) {
                    cb(record)
                }
            })
    })
}

exports.delete_record = (record_id) => {
    g_db.serialize(function () {
        g_db.run(`DELETE FROM record WHERE id=?`, [record_id],
            function (err) {
                if (err) {
                    throw err
                } else {
                    main_utils.notify_all_windows('record-deleted', record_id)
                }
            })
    })
}

exports.get_some_records = (offset, query, cb) => {

    g_db.serialize(function () {
        let sql = `SELECT  * 
        FROM record  ORDER BY date DESC LIMIT 30 OFFSET ${offset} `;

        if (query) {
            sql = `SELECT  * 
        FROM record WHERE domain like '%${query}%'  ORDER BY id DESC LIMIT 30 OFFSET ${offset} `;
        }

        g_db.all(sql, [], function (err, rows) {
            if (err) {
                throw err
            }
            if (cb) {
                cb(rows)
            }
        })
    })
}

exports.get_all_records = (cb) => {

    g_db.serialize(function () {
        let sql = `SELECT  * 
        FROM record `

        g_db.all(sql, [], function (err, rows) {
            if (err) {
                throw err;
            }
            if (cb) {
                cb(rows)
            }
        })
    })
}