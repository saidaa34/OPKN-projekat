var express = require('express');
var router = express.Router();

const pg = require('pg');

const config = {
  // user: '',
  // host: '',
  // database: '',
  // password: '',
  // port: ,
  // max: ,
  // idleTimeoutMillis: 
}

const pool = new pg.Pool(config);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

var bcrypt = require('bcrypt');

let pomocne = {
  kriptuj: function (lozinka){
    var kriptovana_lozinka = bcrypt.hashSync(lozinka, 10);
    return kriptovana_lozinka;
  }
}

let db = {
  registracijaKorisnika: function (req, res, next) {
    var korisnik = {
      email: req.body.email,
      ime: req.body.ime,
      prezime: req.body.prezime,
      lozinka: pomocne.kriptuj(req.body.lozinka),
      status: req.body.status || 'Radnik',
      nadredjeni: req.body.nadredjeni || 'Saida Kurtanovic',
      prv: req.body.prv || '09:00:00',
      krv: req.body.krv || '16:00:00'
    };

    console.info(korisnik);

    // Provjeri je li korisnik već registriran
    pool.connect(function (err, client, done) {
      if (err) {
        res.send(err);
        return;
      }

      client.query('select * from zaposlenici where email = $1', [korisnik.email], function (err, result) {
        done();
        if (err) {
          console.info(err);
          res.sendStatus(500);
        } else {
          // Ako korisnik već postoji, pošalji odgovarajući odgovor
          if (result.rows.length > 0) {
            res.redirect('/admin');

          } else {
            // Ako korisnik ne postoji, izvrši unos u bazu podataka
            client.query('insert into zaposlenici(email, ime, prezime, lozinka, status, nadredjeni, pocetak_rv, kraj_rv) values ($1, $2, $3, $4, $5, $6, $7, $8);', [korisnik.email, korisnik.ime, korisnik.prezime, korisnik.lozinka, korisnik.status, korisnik.nadredjeni, korisnik.prv, korisnik.krv], function (err, result) {
              if (err) {
                console.info(err);
                //res.sendStatus(500);
              } else {
                console.info(result);
                next();
              }
            });
          }
        }
      });
    });
  },
  provjeriLogin: function (req, res, next) {
    var korisnik = {
      email: req.body.email,
      lozinka: req.body.lozinka
    }
    console.info(korisnik);
    pool.connect(function (err, client, done) {
      if (err)
        res.send(err);
      client.query(`select * from zaposlenici where email = $1;`, [korisnik.email], function (err, result) {
        done();
        if (err) {
          console.info(err);
          res.sendStatus(500);
        } else {
          if (result.rows.length === 0) { //znaci da nema tog korisnika
            return res.redirect('/login'); //treba mi return da ne bi nastavilo ovo dolje da se izvršava
          } else {
            let kritoLozinka = result.rows[0].lozinka;
            if(bcrypt.compareSync(korisnik.lozinka,kritoLozinka)){
              console.info("usao");
              //ako je sve proslo kako treba:
              res.korisnik = {
                email: result.rows[0].email,
                ime: result.rows[0].ime,
                prezime: result.rows[0].prezime
              };
              res.statusKorisnika = result.rows[0].status;
              console.info("status korsisnika");
              console.info(result.rows[0].status);
              next(); //kad je login uspjesan
            }
            else {
              console.info("netacna lozinka");
              return res.redirect('/login');
            }
          }
        }
        console.info(result);
      });
    });
  },
  zaNadredjene: function () {
    return new Promise((resolve, reject) => {
      let niz = [];
      pool.connect(function (err, client, done) {
        if (err) {
          done();
          reject(err);
          return;
        }
        client.query(`select * from zaposlenici;`, [], function (err, result) {
          done();
          if (err) {
            console.info(err);
            reject(err);
          } else {
            console.info("sve");
            console.info(result);

            let brojac = 0;
            while (result.rows[brojac] !== undefined) {
              console.info("pojedinacno");
              console.info(result.rows[brojac]);
              console.info(result.rows[brojac].status);
              if (result.rows[brojac].status === 'Menadzer' || result.rows[brojac].status === 'Administrator') {
                console.info("DA");
                let pomObj = {
                  ime: result.rows[brojac].ime,
                  prezime: result.rows[brojac].prezime
                };
                niz.push(pomObj);
              }
              brojac++;
            }

            console.info("NIZ");
            console.info(niz);
            resolve(niz);
          }
        });
      });
    });
  },
  dodajProjekat: function (req, res, next) {
    var projekat = {
      naziv: req.body.naziv,
      opis: req.body.opis,
      sdatum : req.body.sdatum,
      zdatum: req.body.zdatum,
      radnik: req.body.radnik
    }
    console.info(projekat);
    pool.connect(function (err, client, done) {
      if (err)
        res.send(err);
      client.query(`insert into projekti(naziv,opis,startni_datum,zavrsni_datum,nadredjeni) values ($1,$2,$3,$4,$5);`, [projekat.naziv,projekat.opis,projekat.sdatum,projekat.zdatum,projekat.radnik], function (err, result) {
        done();
        if (err) {
          console.info(err);
          res.sendStatus(500);
        } else {
          console.info(result);
          next();
        }
      });
    });
  },
  getSveZaposlenike: function (req, res, next) {
    pool.query(`select * from zaposlenici;`, (err,result) => {
      if(err){
        res.send(err);
        return next();
      }
      req.zaposlenici = result.rows;
      next();
    })
  },
  getSveTaskove: function (req, res, next) {
    pool.query(`select * from taskovi;`, (err,result) => {
      if(err){
        res.send(err);
        return next();
      }
      req.taskovi = result.rows;
      next();
    })
  },
  getSveProjekte: function (req, res, next) {
    pool.query(`select * from projekti;`, (err,result) => {
      if(err){
        res.send(err);
        return next();
      }
      req.projekti = result.rows;
      next();
    })
  },
  getSveIzVezne: function (req, res, next) {
    pool.query(`select * from radnik_projekat;`, (err,result) => {
      if(err){
        res.send(err);
        return next();
      }
      req.vezna = result.rows;
      next();
    })
  },
  dodijeliProjekat2: function (req, res, next) {
    var projekat = {
      naziv: req.body.naziv,
      radnik: req.body.radnik
    }
    pool.connect(function (err, client, done) {
      if (err) {
        res.send(err);
        return;
      }
      client.query(`select count(*) from radnik_projekat where idz = (select idz from zaposlenici where email = $1) and idp = (select idp from projekti where naziv = $2);`, [projekat.radnik,projekat.naziv], function (err, result) {
        console.info("usao sam ne brini1");
        if (err) {
          console.info(err);
          res.sendStatus(500);
        } else {
          if (result.rows.length === 0) {
            res.redirect('/admin');
          } else {
            client.query(`insert into radnik_projekat(idz,idp) values ((select idz from zaposlenici where email = $1), (select idp from projekti where naziv = $2));`, [projekat.radnik,projekat.naziv], function (err, result) {
              done();
              console.info("usao sam ne brini2");
              if (err) {
                console.info(err);
                //res.sendStatus(500);
              } else {
                console.info(result);
                next();
              }
            });
          }
        }
      });
    });
  },
  dodijeliProjekat3: function (req, res, next) {
    var projekat = {
      naziv: req.body.naziv,
      radnik: req.body.radnik
    }
    pool.connect(function (err, client, done) {
      if (err) {
        res.send(err);
        return;
      }
      client.query(`select count(*) from radnik_projekat where idz = (select idz from zaposlenici where email = $1) and idp = (select idp from projekti where naziv = $2);`, [projekat.radnik,projekat.naziv], function (err, result) {
        if (err) {
          console.info(err);
          res.sendStatus(500);
        } else {
          if (result.rows.length === 0) {
            res.redirect('/menadzer');
          } else {
            client.query(`insert into radnik_projekat(idz,idp) values ((select idz from zaposlenici where email = $1), (select idp from projekti where naziv = $2));`, [projekat.radnik,projekat.naziv], function (err, result) {
              done();
              if (err) {
                console.info(err);
                //res.sendStatus(500);
              } else {
                console.info(result);
                next();
              }
            });
          }
        }
      });
    });
  },
  dodajSate: function (req, res, next) {
    var projekat = {
      naziv: req.body.naziv,
      sati: req.body.sati
    }
    pool.connect(function (err, client, done) {
      if (err)
        res.send(err);
      client.query(`update projekti set sati = $1 where naziv = $2;`, [projekat.sati,projekat.naziv], function (err, result) {
        done();
        if (err) {
          console.info(err);
          res.sendStatus(500);
        } else {
          console.info(result);
          next();
        }
      });
    });
  },
  urediZposlenika: function (req, res, next) {
    var zaposlenik = {
      radnik: req.body.radnik,
      email: req.body.email,
      lozinka: pomocne.kriptuj(req.body.lozinka),
      status: req.body.status || 'Radnik',
      nadredjeni: req.body.nadredjeni || 'Saida Kurtanovic',
      prv: req.body.prv || '09:00:00',
      krv: req.body.krv || '16:00:00'
    }
    console.info("zapppp");
    console.info(zaposlenik);
    pool.connect(function (err, client, done) {
      if (err)
        res.send(err);
      client.query(`update zaposlenici set email = $1, lozinka = $2, status = $3, nadredjeni = concat_ws(' ',(select ime from zaposlenici where email = $4),(select prezime from zaposlenici where email = $4)), pocetak_rv = $5, kraj_rv = $6 where email = $7;`, [zaposlenik.email,zaposlenik.lozinka, zaposlenik.status, zaposlenik.nadredjeni, zaposlenik.prv, zaposlenik.krv,zaposlenik.radnik], function (err, result) {
        done();
        if (err) {
          console.info(err);
          res.sendStatus(500);
        } else {
          console.info(result);
          next();
        }
      });
    });
  },
  dodijeliTask: function (req, res, next) {
    var taskk = {
      naziv: req.body.naziv,
      task: req.body.task,
      rdatum : req.body.rdatum || null,
      zdatum: req.body.zdatum || null
    }
    console.info(taskk);
    pool.connect(function (err, client, done) {
      if (err)
        res.send(err);
      client.query(`insert into taskovi(idp,naziv_taska,rok,zavrsni) values ((select idp from projekti where naziv = $1),$2,$3,$4);`, [taskk.naziv,taskk.task,taskk.rdatum,taskk.zdatum], function (err, result) {
        done();
        if (err) {
          console.info(err);
          res.sendStatus(500);
        } else {
          console.info(result);
          next();
        }
      });
    });
  },
  dodijeliTask2: function (req, res, next) {
    let stringg = req.body.task;
    console.info(stringg);
    let projekat = '';
    let task = '';
    let sati = '';
    for (let i = 1; i < stringg.length; i++) {
      while (i < stringg.length && stringg[i] !== '#') {
        projekat += stringg[i];
        i++;
      }
      projekat = projekat.slice(0, -1);
      i++;
      i++;
      while (i < stringg.length && stringg[i] !== ' ') {
        console.info("Ovdje");
        console.info(task);
        task += stringg[i];
        i++;
      }
      i++;
      i++;
      while(i < stringg.length ){
        sati += stringg[i];
        i++;
      }
      break;
    }
    console.info("projekat task");
    console.info(projekat);
    console.info(task);
    console.info(sati);
        pool.connect(function (err, client, done) {
          if (err)
            res.send(err);
          client.query(`update taskovi set sati = $1 where idp = (select idp from projekti where naziv = $2) and naziv_taska = $3;`, [parseInt(sati, 10),projekat,task], function (err, result) {
            done();
            if (err) {
              console.info(err);
              res.sendStatus(500);
            } else {
              console.info(result);
              next();
            }
          });
        });
  }
};
console.info("niz:");
console.info(db.zaNadredjene());
/*
router.get('/registracija',
    function(req, res, next) {
  res.render('registracija', { title: 'Registracija', zaposleni: db.zaNadredjene() });
});
*/
router.get('/registracija', async function (req, res, next) {
  try {
    const zaposleni = await db.zaNadredjene();
    res.render('registracija', { title: 'Registracija', zaposleni: zaposleni });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

router.post('/registracija',
    db.registracijaKorisnika,
    function(req, res, next) {
      res.redirect('/admin');
    });

router.post('/registracijaa',
    db.registracijaKorisnika,
    function(req, res, next) {
      res.redirect('/login');
    });

router.get('/login', function(req, res, next) {
  res.clearCookie('user');
  res.render('login', { title: 'Prijava' });
});

router.post('/login',
    db.provjeriLogin,
    function(req, res, next) {
      console.info("login uspjesan ovdje");
      console.info(res.korisnik.email);
      let user = res.korisnik.email;
      res.cookie('user',user);
      console.info("status korisnika:");
      console.info(res.statusKorisnika);
      if(res.statusKorisnika === 'Administrator'){
        res.redirect('/admin');
      }
      else if(res.statusKorisnika === 'Menadzer'){
        res.redirect('/menadzer');
      }
      else {
        res.redirect('/radnik');
      }
      //res.sendStatus(200);
    });

router.get('/admin',
    db.getSveZaposlenike,
    db.getSveProjekte,
    db.getSveIzVezne,
    async function(req, res, next) {
      let korisnik = req.cookies['user'];
      if (typeof korisnik === 'undefined'){
        res.redirect('/login');
        return;
      }
      try {
        const zaposleni = await db.zaNadredjene();
        res.render('admin', { title: 'Admin' , zaposlenici: req.zaposlenici, zaposleni: zaposleni, projekti: req.projekti, vezna: req.vezna });
      } catch (err) {
        console.error(err);
        res.sendStatus(500);
      }
});
/*
router.get('/projekat', function(req, res, next) {
  res.render('projekat', { title: 'Dodaj projekat' });
});*/

router.post('/projekat',
    db.dodajProjekat,
    function(req, res, next) {
      res.redirect('/admin');
    });

router.post('/dodijeli-projekat',
    db.dodijeliProjekat2,
    function(req, res, next) {
      res.redirect('/admin');
    });

router.post('/dodaj-sate',
    db.dodajSate,
    function(req, res, next) {
      res.redirect('/admin');
    });

router.get('/brisi/korisnika/:id', function (req, res, next){
  let korisnik = req.cookies['user'];
  if (typeof korisnik === 'undefined'){
    res.redirect('/login');
    return;
  }
  pool.connect(function (err,client,done) {
    if (err)
      res.send(err);
    client.query(`delete from zaposlenici where idz = $1;`, [req.params.id], function (err, result) {
      done();
      if (err) {
        console.info(err);
        res.send(err);
      } else {
        console.info("izbrisan");
        res.redirect('/admin');
        next();
      }
    })
  })
});

router.get('/dodaj-kraj/:id', function (req, res, next){
  let korisnik = req.cookies['user'];
  if (typeof korisnik === 'undefined'){
    res.redirect('/login');
    return;
  }
  pool.connect(function (err,client,done) {
    if (err)
      res.send(err);
    client.query(`update projekti set kraj = current_timestamp where idp = $1;`, [req.params.id], function (err, result) {
      done();
      if (err) {
        console.info(err);
        res.sendStatus(500);
      } else {
        console.info("izbrisan");
        res.redirect('/admin');
        next();
      }
    })
  })
});

router.get('/uredi',
    db.getSveZaposlenike,
    function(req, res, next) {
      let korisnik = req.cookies['user'];
      if (typeof korisnik === 'undefined'){
        res.redirect('/login');
        return;
      }
      res.render('uredi-korisnika', { title: 'Uredi korisnika' , zaposlenici: req.zaposlenici});
});

router.post('/uredi',
    db.urediZposlenika,
    function(req, res, next) {
      res.redirect('/admin');
    });


//ovdje mi pocinje menadzer:

router.get('/menadzer',
    db.getSveZaposlenike,
    db.getSveProjekte,
    db.getSveIzVezne,
    db.getSveTaskove,
    async function(req, res, next) {
      let korisnik = req.cookies['user'];
      if (typeof korisnik === 'undefined'){
        res.redirect('/login');
        return;
      }
      try {
        const zaposleni = await db.zaNadredjene();
        res.render('menadzer', { title: 'Menadzer' , zaposlenici: req.zaposlenici, zaposleni: zaposleni, projekti: req.projekti, vezna: req.vezna, taskovi: req.taskovi });
      } catch (err) {
        console.error(err);
        res.sendStatus(500);
      }
    });

router.post('/projekat2',
    db.dodajProjekat,
    function(req, res, next) {
      res.redirect('/menadzer');
    });

router.post('/dodijeli-projekat2',
    db.dodijeliProjekat3,
    function(req, res, next) {
      res.redirect('/menadzer');
    });

router.post('/dodaj-sate2',
    db.dodajSate,
    function(req, res, next) {
      res.redirect('/menadzer');
    });

router.post('/dodijeli-task',
    db.dodijeliTask,
    function(req, res, next) {
      res.redirect('/menadzer');
    });

router.get('/dodaj-kraj2/:id', function (req, res, next){
  let korisnik = req.cookies['user'];
  if (typeof korisnik === 'undefined'){
    res.redirect('/login');
    return;
  }
  pool.connect(function (err,client,done) {
    if (err)
      res.send(err);
    client.query(`update projekti set kraj = current_timestamp where idp = $1;`, [req.params.id], function (err, result) {
      done();
      if (err) {
        console.info(err);
        res.sendStatus(500);
      } else {
        console.info("izbrisan");
        res.redirect('/menadzer');
        next();
      }
    })
  })
});

router.get('/dodaj-kraj-tasku/:id', function (req, res, next){
  let korisnik = req.cookies['user'];
  if (typeof korisnik === 'undefined'){
    res.redirect('/login');
    return;
  }
  pool.connect(function (err,client,done) {
    if (err)
      res.send(err);
    client.query(`update taskovi set zavrsni = current_timestamp where idt = $1;`, [req.params.id], function (err, result) {
      done();
      if (err) {
        console.info(err);
        res.sendStatus(500);
      } else {
        console.info("izbrisan task");
        res.redirect('/menadzer');
        next();
      }
    })
  })
});

router.get('/dodaj-sate-tasku/:id', function (req, res, next){
  let korisnik = req.cookies['user'];
  if (typeof korisnik === 'undefined'){
    res.redirect('/login');
    return;
  }
  pool.connect(function (err,client,done) {
    if (err)
      res.send(err);
    client.query(`update taskovi set sati = (select sati from taskovi where idt = $1)+1 where idt = $1;`, [req.params.id], function (err, result) {
      done();
      if (err) {
        console.info(err);
        res.sendStatus(500);
      } else {
        res.redirect('/radnik');
        next();
      }
    })
  })
});

router.get('/radnik',
    db.getSveZaposlenike,
    db.getSveProjekte,
    db.getSveIzVezne,
    db.getSveTaskove,
    async function(req, res, next) {
      let korisnik = req.cookies['user'];
      if (typeof korisnik === 'undefined'){
        res.redirect('/login');
        return;
      }
      try {
        const zaposleni = await db.zaNadredjene();
        res.render('radnik', { title: 'Radnik' , zaposlenici: req.zaposlenici, zaposleni: zaposleni, projekti: req.projekti, vezna: req.vezna, taskovi: req.taskovi });
      } catch (err) {
        console.error(err);
        res.sendStatus(500);
      }
    });

router.post('/dodaj-sate3',
    db.dodajSate,
    function(req, res, next) {
      res.redirect('/radnik');
    });

router.post('/dodijeli-task3',
    db.dodijeliTask,
    function(req, res, next) {
      res.redirect('/radnik');
    });

router.post('/projekat_task',
    db.dodijeliTask2,
    function(req, res, next) {
      res.redirect('/radnik');
    });

module.exports = router;
