import express from 'express'
import cors from 'cors'
import joi from 'joi'
import day from 'dayjs'
import { MongoClient } from 'mongodb'
import dotenv from "dotenv"

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Estava tendo um erro ao usar localhost. Após pesquisar na internet, encontrei a solução de trocar localhost por 0.0.0.0
const mongoClient = new MongoClient(process.env.DATABASE_URL);
var db;

mongoClient.connect().then(db = mongoClient.db());

function remove(){
    const now = Date.now();

    db.collection('participants').find().toArray().then(users => {
        // Verifica os que serão desligados
        for (let a = 0; a < users.length; a++){
            if (now - users[a].lastStatus >= 10){
                db.collection('participants').deleteOne(users[a]);
                const objMessage = {from: users[a].name, to: 'Todos', text: 'sai da sala...', type: 'status', time: day().format('HH:mm:ss')};
                db.collection('messages').insertOne(objMessage);
            }
    }})
}

setInterval(remove, 15000);

app.post('/participants', (req, res) => {
    const data = req.body;
    const user = data.name;
    const expectedName = joi.string().required();

    db.collection('participants').find().toArray().then(users => {
        // Faz a validação do userName
        const { error, value } = expectedName.validate(user);
        if (error == undefined){

            function right(name){
                const objMessage = {from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: day().format('HH:mm:ss')};
                db.collection('messages').insertOne(objMessage);
                const objName = {name: name, lastStatus: Date.now()};
                db.collection('participants').insertOne(objName);
                res.sendStatus(201);
            }

            if (users.length > 0){
                for(let a = 0; a < users.length; a++){
                    if (users[a].name == user){
                        res.sendStatus(409);
                        break;
                    }
                    else if (a == users.length - 1 && users[a].name != user){
                        right(user);
                    }
                }
            }
            else{
                right(user);
            }
        }
        else{
            res.sendStatus(422);
        }
})})

app.get('/participants', (req, res) => {
    db.collection('participants').find().toArray().then(users => res.send(users));
})

app.post('/messages', (req, res) =>{
    const data = req.body;
    const from = req.get('User');

    db.collection('participants').find().toArray().then(users => {
        // Valida o tipo dos dados
        const toTextJoi = joi.string();
        const typeJoi = joi.any().allow('message', 'private_message');
        const fromJoi = joi.any().required();
        const { errorTo, valueTo } = toTextJoi.validate(data.to);
        const { errorText, valueText } = toTextJoi.validate(data.text);
        const { errorType, valueType } = typeJoi.validate(data.type);
        const { errorFrom, valueFrom } = fromJoi.validate(from);

        // verifica se o from está na sala
        let foundFrom = 0;
        for (let a = 0; a < users.length; a++){
            if (users[a].name == from){
                foundFrom = 1;
                break;
            }
        }

        if (errorTo == undefined && errorText == undefined && errorType == undefined && errorFrom == undefined && foundFrom == 1){
            // adicionar time e from para o objeto
            let newObject = {from: from, to: data.to, text: data.text, type: data.type, time: day().format('HH:mm:ss')};
            db.collection('messages').insertOne(newObject);
            res.sendStatus(201);
        }
        else{
            res.sendStatus(422);
        }
})})

app.get('/messages', (req, res) => {
    const user = req.get('User');

    db.collection('messages').find().toArray().then(messages => {
        const limit = req.query.limit;
        const limitJoi = joi.number().integer().positive();
        const userJoi = joi.string().required;
        const { errorLimit, valueLimit } = limitJoi.validate(limit);
        const { errorUser, valueUser } = userJoi.validate(user);

        if (errorLimit == undefined && errorUser == undefined){
            let messagesIt = [];

            // Verificar todas as mensagens mandadas em Todos, para ele e por ele (privadas)
            for (let a = 0; a < messages.length; a++){
                if (messages[a].to == 'Todos' || messages[a].to == user || messages[a].from == user){
                    if (messagesIt.length == 0){
                        messagesIt.push(messages[a]);
                    }
                    else{
                        for (let b = 0; b < messagesIt.length; b++){
                            if (messagesIt[b] == messages[a]){
                                break;
                            }
                            else if (b == messagesIt.length - 1 && messagesIt[b] != messages[a]){
                                messagesIt.push(messages[a]);
                            }
                        }
                    }
                }
            }
            // Verificar se há limite
            if (limit != undefined){
                let messagesOutput = [];
                for (let a = 0; a < limit; a++){
                    messagesOutput.push(messagesIt[messagesIt.length - a - 1]);
                }
                res.send(messagesOutput);
            }
            else{
                res.send(messagesIt);
            }
        }
        else {
            res.sendStatus(422);
        }
})})

app.post('/status', (req, res) => {
    const user = req.get('User');
    db.collection('participants').find().toArray().then(users => {
        // Valida o User e verifica se ele está em Users
        const userJoi = joi.string().required();
        const { errorUser, valueUser } = userJoi.validate(user);
        let foundUser = -1;
        for (let a = 0; a < users.length; a++){
            if (users[a].name == user){
                foundUser = a;
                break;
            }
        }

        if (errorUser == undefined && foundUser != -1){
            //Atualiza o lastStatus
            db.collection('participants').deleteOne({ name: user });
            db.collection('participants').insertOne({name: user, lastStatus: Date.now()});
            res.sendStatus(200);
        }
        else{
            res.sendStatus(404);
        }
})})

app.listen(5000, () => console.log('Running on port 5000'));