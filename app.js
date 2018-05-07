// CITE:  https://github.com/GoogleCloudPlatform/nodejs-getting-started/blob/master/2-structured-data/books/crud.js
'use strict';

// [START app]
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
var path = require('path');
const http = require('http');
const url = require('url');
const opn = require('opn');
const destroyer = require('server-destroy');
var session = require('express-session');


const app = express();
app.enable('trust proxy');
var boatRouter = express.Router();
var slipRouter = express.Router();
var oauthRouter = express.Router();
var authRouter = express.Router();
var router = express.Router();

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session({ secret: 'keyboard car', cookie: { maxAge: 60000 } }));

const Datastore = require('@google-cloud/datastore');

// Your Google Cloud Platform project ID
const projectId = 'custom-hold-200307';

// Creates a client
const datastore = new Datastore({
  projectId: projectId,

  keyFilename: "cs496Project-bc1a11cf15b1.json",
});


//set up a OAuth for google api
const {google} = require('googleapis');
const  clientID = '326024602057-v6l54ub910jls58h67ghnk8etpc3u0qe.apps.googleusercontent.com';
const  clientSECRET = 'GDENI0yysNqPdH12jPG6bFP-';
const  call_auth = 'https://accounts.google.com/o/oauth2/v2/auth';
const  redirectURI = 'http://localhost:9999/oauth'; 
const oauth2Client = new google.auth.OAuth2(
	clientID,
	clientSECRET,
	redirectURI
	);
// generate a url that asks permissions for Google+
const scopes = [
  'https://www.googleapis.com/plus/v1/people/me'];
const plus = google.plus('v1');

google.options({ auth: oauth2Client });


//view engine set up
app.set('views',path.join(__dirname,'views/'));
app.set('view engine','jade');

// [END setup]
const boatKey = datastore.key('Boat');
const slipKey = datastore.key('Slip');

boatRouter.post('/',function(req, res)  {

	var boat={};

	if(!req.body) {
	 boat={
		id:makeid(),
		name:"demo",
		type:"boat",
		length:25,
		at_sea: false,
	};
	} else
	{
		boat={
		id:makeid(),
		name:req.body.name,
		type:req.body.type,
		length:req.body.length,
		at_sea: req.body.at_sea};
		 
	}
	console.log(boat);
	addBoat(boat);

  res.status(200).send("Just added a new Boat at the sea!");
  
});

boatRouter.get('/', function(req, res, next) {
	const query = datastore.createQuery('Boat')
	datastore
   	.runQuery(query)
    .then((results) => {
    	
    	var entities = results[0];
    	var data=[];
    	var i=0;
    	entities.forEach((entity)=>{
    		console.log(entity);
    		i=i+1;
    		data.push(i+'\t'+entity.id+"\t"+entity.name);
    	});	
    	res
    		.status(200)
    		//.set('Content-Type', 'application/json')
    		//post man does not like this format werid!
    		.send(`Boat history:\n ${data.join('\n')}`)
    		.end();
    })
    .catch(next);
  
});

boatRouter.get('/:id',function (req, res, next) {
	let boat=req.params.id;
	console.log(boat);
	const query = datastore.createQuery('Boat')
		.filter('id',boat)
	datastore
   	.runQuery(query)
    .then((results) => {
    	
    	var entities = results[0];
    	var data=[];
    	var list;
    	console.log(entities);
    	entities.forEach((entity)=>{
    		data.push(entity.id+'\t'+entity.name +'\t'+ entity.type +'\t'+ entity.at_sea +'\t'+ entity.length);
    	});	
    	res
    		.status(200)
    		//.set('Content-Type', 'application/json')
    		//agian, not sure why pm dont like this.
    		.send(`Boat details - \n ${data}`)
    		.end();
    })
    .catch(next);
  
});

boatRouter.patch('/:id',function(req,res,next){
	let boat =req.params.id;
	
	var newValue = req.body.at_sea;
	console.log(newValue);

	const query = datastore.createQuery('Boat')
		.filter('id', boat)
  	
  	query.run(function(err, entities) {
  		 
  		var keys = entities.map(function(entity) {

        // datastore.KEY is a Symbol
        return entity[datastore.KEY];
    	});

    	var newboat=entities[0];
    	newboat.at_sea = newValue;

    	datastore
    	.save(newboat)
    	.catch(err => {
    		console.error('ERROR:', err);});
    	}
      );

   	 res
    	.status(201)
    	//.set('Content-Type', 'application/json')
    	.send(`Boat id ${boat} now changed status to ${newValue}`)
    	.end();

});


boatRouter.delete('/:id',function(req, res,next) {

	 let boat = req.params.id;
	  
	 const query = datastore.createQuery('Boat')
		.filter('id', boat)

  	query.run(function(err, entities) {
  		 
  		var keys = entities.map(function(entity) {

        // datastore.KEY is a Symbol
        return entity[datastore.KEY];
    	});
    	console.log(entities[0].name);
    	datastore
    	.delete(keys);
    	console.log(entities[0]);

    	//if not at_sea, then find the slip
    	if(entities[0].at_sea === false ){
    		console.log('check here');
    		var status = datastore.createQuery('Slip')
			.filter('current_boat', entities[0].name)
			console.log(status);

			status.run(function(err,data){
		 	console.log(data[0]);
			var mykey = data.map(function(data2){
			return data2[datastore.KEY];
			});
    		

    		var newSlip = data[0];
    		newSlip.current_boat=null;
    		newSlip.arrival_date=null;

    		datastore
    		.save(newSlip)
    		.catch(err => {
    		console.error('ERROR:', err);});
			})
    	}

    	/*now delete the history
    	var status = datastore.createQuery('Slip')
			.filter('departure_history.departed_boat', entities[0].name)

		 status.run(function(err,data){
		 
			var keys = data.map(function(data2){
			return data2[datastore.KEY];
			});
    		

    		var newSlip = data[0];

    		newSlip.departure_history.departed_boat=null;
    		newSlip.departure_history.departure_date=null;

    		datastore
    		.save({
    			key:keys,
    			data:newSlip,})
			})

		*/



		//updateSlip(keys,null,null,history);

	
    	 
	});
	 
	 
   	 res
    	.status(200)
    	//.set('Content-Type', 'application/json')
    	.send(`Boat ${boat} deleted!`)
    	.end();

  
});

//move  the boat  At Sea
boatRouter.put('/:id',function(req,res,next){
	let boat = req.params.id;

	const query = datastore.createQuery('Boat')
		.filter('id', boat)

  	query.run(function(err, entities) {
  		 
  		var keys = entities.map(function(entity) {

        // datastore.KEY is a Symbol
        return entity[datastore.KEY];
    	});
    	//updateBoat(keys,true);
    	
    	var newboat=entities[0];
    	newboat.at_sea = true;

    	datastore
    	.save(newboat)

    	var status1 = datastore.createQuery('Slip')
		.filter('current_boat', boat)
		 
		status1.run(function(err,data){
			var keys = data.map(function(data2){
				return data2[datastore.KEY];
			});
			console.log(data[0]);
			var history={};
			history.departure_date=new Date(Date.now());
			history.departed_boat = boat;
			var newSlip = data[0];
			newSlip.departure_history=history;
			newSlip.current_boat=null;
			newSlip.arrival_date=null;
    	 	console.log(newSlip);
    		datastore
    		.save(newSlip)
    		.catch(err => {
    		console.error('ERROR:', err);});

			//updateSlip(keys,null,null,history);
		})
    	 
	});
	 
	 
   	 res
    	.status(200)
    	//.set('Content-Type', 'application/json')
    	.send(`Boat ${boat} at sea now!`)
    	.end();

})

app.use('/boat',boatRouter);



//handlers for slip add/update/delete/list

slipRouter.post('/',function(req, res)  {
	var slip={};
	if(!req.body) {
	slip={
		id:makeid(),
		number:0,
		current_boat: null,
		arrival_date: new Date(Date.now()),
		departure_history: null,
	};}
	else{
		//console.log((req.body));
		var history={};
			history.departure_date=req.body.departure_date;
			history.departed_boat = req.body.departed_boat;
		slip={
		id:makeid(),
		number:req.body.number,
		current_boat: req.body.current_boat,
		arrival_date: req.body.arrival_date,
		departure_history: history,
		}
	}

	addSlip(slip);

  res.status(201).send("Just added a new Slip for the boat!");
  
});

slipRouter.get('/', function(req, res, next) {
	const query = datastore.createQuery('Slip')
	datastore
   	.runQuery(query)
    .then((results) => {
    	
    	var entities = results[0];
    	var data=[];
    	
    	entities.forEach((entity)=>{
    		console.log(entity);
    		
    		data.push(entity.number+'\t'+entity.id+"\t"+entity.number+'\t'+entity.current_boat);
    	});	
    	res
    		.status(200)
    		//.set('Content-Type', 'application/json')
    		.send(`Slip history:\n ${data.join('\n')}`)
    		.end();
    })
    .catch(next);
  
});

slipRouter.get('/:id',function (req, res, next) {
	let slip=req.params.id;
	console.log(slip);
	const query = datastore.createQuery('Slip')
		.filter('id',slip)
	datastore
   	.runQuery(query)
    .then((results) => {
    	
    	var entities = results[0];
    	var data=[];
    	var list;
    	console.log(entities);
    	entities.forEach((entity)=>{
    		if(entity.departure_history === null)
    			data.push(entity.id +'\t'+ entity.number + '\t'+entity.arrival_date+ '\t' +entity.current_boat);
    		else
    			data.push(entity.id +'\t'+ entity.number + '\t'+entity.arrival_date+ '\t' +entity.current_boat+'\t'+entity.departure_history.departed_boat+'\t'+entity.departure_history.departure_date);
    	});	
    	res
    		.status(200)
    		//.set('Content-Type', 'application/json')
    		.send(`Slip details - \n ${data.join('\n')}`)
    		.end();
    })
    .catch(next);
  
});

slipRouter.patch('/:id',function(req,res,next){
	let task = req.params.id;
	 
	var newValue1 = req.body.current_boat;
	var newValue2 = req.body.arrival_date;
	var newValue3 = req.body.history;
	 
	const query = datastore.createQuery('Slip')
		.filter('id', task)

	query.run(function(err, entities) {
  		 console.log(entities[0]);
  		var keys = entities.map(function(entity) {

        // datastore.KEY is a Symbol
        return entity[datastore.KEY];
    	});

    	var newslip=entities[0];
    	newslip.current_boat = newValue1;
    	newslip.arrival_date = newValue2;
    	newslip.departure_history=newValue3;

    	datastore
    	.save(newslip)
    	.catch(err => {
    		console.error('ERROR:', err);});

    	});
    	//updateSlip(task,newValue1,newValue2,newValue3);

   	 res
    	.status(200)
    	//.set('Content-Type', 'application/json')
    	.send(`Slip ${task} now changed!`)
    	.end();

});

slipRouter.delete('/:id',function(req, res,next) {

	 let task0 = req.params.id;
	 const query = datastore.createQuery('Slip')
		.filter('id', task0)
  	
  	query.run(function(err,entities){
  		//console.log(entities)
  		var keys = entities.map(function(entity){
  			return entity[datastore.KEY];
  		});
  		
  		datastore
  		.delete(keys);
  		//console.log(entities[0])
  		if(entities[0].current_boat !== null){
  			console.log(status1)
  			var status1 = datastore.createQuery('Boat')
  			.filter('id',entities[0].current_boat)
  			console.log(status1);

  			status1.run(function(err,task){
	  			console.log(task[0]);
  				var mykeys = task.map(function(task2){
  					return task2[datastore.KEY];});

    			var newboat=task[0];	
    			newboat.at_sea = true;

    			datastore
    			.save(newboat)
    			.catch(err => {
    			console.error('ERROR:', err);});
  			//updateBoat(keys,true);
  			})
  		}

  		
  	});

   	 res
    	.status(200)
    	//.set('Content-Type', 'application/json')
    	.send(`Slip ${task0} released!`)
    	.end();

  
});

// manage the boat arrival
slipRouter.put('/:id',function(req,res,next){
	let boat = req.params.id;
	var task = req.body;

	const query = datastore.createQuery('Boat')
		.filter('id', boat)

  	query.run(function(err, entities) {

  		console.log(entities[0]);
  		var keys = entities.map(function(entity) {
        	return entity[datastore.KEY];
    	});
    	//updateBoat(keys,false);
    	
    	var status = datastore.createQuery('Slip')
		.filter('id', task.id)

		status.run(function(err,data){
		 
			var mykey = data.map(function(data2){
				return data2[datastore.KEY];});

			console.log(data[0]);
			
			if(data[0].current_boat !== null)
				res.status(403).send("Slip cant moved in! Already full!").end();

			else{
				//update the currentboat and arrival data.
				var newslip =data[0];
				newslip.arrival_date=task.arrival_date;
				newslip.current_boat=boat;
				datastore
    			.save(newslip)
    			.catch(err => {
    			console.error('ERROR:', err);});
			}
		});

		//update boat at_sea
		console.log(entities[0]);
		var newboat=entities[0];
    	newboat.at_sea = false;

    	datastore
    	.save(newboat)
    	.catch(err => {
    			console.error('ERROR:', err);});
    	
	});

   	 res
    	.status(201)
    	//.set('Content-Type', 'application/json')
    	.send(`Boat ${boat} moved in!`)
    	.end();

})


app.use('/slip',slipRouter);

 
 
 
 
function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (var i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
	console.log(text);
  return text;
}

function addBoat (boat) {
 return	datastore.save({
   	 	key: boatKey,
    	data: boat,
    	},function(err,key){
    		if(err){
    			console.error("Error",err);
    		}
   
  		});
}

function addSlip (slip) {
  return datastore.save({
    key: slipKey,
    data: slip
  });
}


function deleteBoat(boat) {

  datastore
    .delete(boat)
    .then(() => {
      console.log(`Boat ${boat.id} deleted successfully.`);
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
  
}



function deleteSlip(slip){

	datastore
    .delete(slip)
    .then(() => {
      console.log(`Slip ${slip.id} deleted successfully.`);
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
}

function updateBoat(updateKey, newboat) {
  const transaction = datastore.transaction();
  //console.log(updateKey)

  transaction
  .run()
  .then(()=>transaction.get(updateKey))
  .then(() => {

      transaction.save({
          key: updateKey,
          data: newboat,
        });
      	console.log(newboat);
      return transaction.commit();
      
  })
  
  .then(()=>{
  	console.log('Task updated!');
  })
  .catch(()=>transaction.rollback());

}

function updateSlip (updateKey, newValue0,newValue1,newValue2) {
  const transaction = datastore.transaction();

  transaction
  .run()
  .then(()=> transaction.get(updateKey))
  .then((entity) => {
  	  const task=entity[0];
  	  console.log(entity);
  	  task.current_boat = newValue0;
      task.arrival_date = newValue1;

      task.history = newValue2;
      transaction.save(
        {
          key: key,
          data: task
        }
      
      );
      return transaction.commit();

  })
  .then(()=>{
  	console.log('Task updated!');
 }) 	
  .catch(() => transaction.rollback());
}


//clientID clientSECRET call_auth redirectURI

oauthRouter.get('/',function(req,res){
	var state = crypto.randomBytes(20).toString('hex');
	//console.log(state)
	//var link = call_auth +'?client_id='+clientID+'&response_type=code&scope=email&redirect_uri='+redirectURI+'&state='+state;
	var link =authenticate();
	res.render('start',{link:link})
});

app.use('/start',oauthRouter);


authRouter.get('/',function(req,res){
	var session=req.session;
	var code = req.query.code;
	var state = req.query.state;

	oauth2Client.getToken(code, function(err, tokens) {
		if(!err){
			oauth2Client.setCredentials(tokens);
			session['token']=tokens;
			 var p = new Promise(function (resolve, reject) {
        		plus.people.get({ userId: 'me', auth: oauth2Client }, function(err, response) {
            		resolve(response || err);
        		});
    		}).then(function (data) {
    			console.log(data.id);
    			var mes={
    				id:data.data[0].id,
    				//fname:data.data[0].name.givenName,
    				//lname:data.data.name.familyName,
    				//url: 'https://www.googleapis.com/plus/v1/people'+id,
    				//email:data.data.emails[0].value,
    				state:state,
    			}
    			console.log(mes);
    			res.render('main',{data:mes});
    		})
    		 .catch(err)
    			console.log(err);
	}else{
		res.status('401').send('error reading your token');
	}
	});
});

app.use('/oauth',authRouter);



function authenticate () {
  
    // grab the url that will be used for authorization
    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: 'email',
    });
    return authorizeUrl;
    }


    /*
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url.indexOf('/oauth') > -1) {
          const qs = querystring.parse(url.parse(req.url).query);
          console.log(`Code is ${qs.code}`);
          res.end('Authentication successful! Please return to the console.');
          server.close();
          const {tokens} = await oauth2Client.getToken(qs.code);
          oauth2Client.credentials = tokens;
          resolve(oauth2Client);
        }
      } catch (e) {
        reject(e);
      }
    }).listen(8080, () => {
      // open the browser to the authorize url to start the workflow
      console.log(authorizeUrl);
      opn(authorizeUrl);

    });
  });

async function runMe () {
	try{
		const oAuth2Client = await authenticate();
		const res = await plus.people.get({ userId: 'me' });
		console.log(res.data);
  		return res.data;
  		
	}catch(e){
		console.error(e)
	}
  process.exit();
  
}*/
// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

// Start the server
const PORT = process.env.PORT || 9999;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});
// [END app]
