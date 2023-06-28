import express from 'express'
import cors from 'cors'
import joi from 'joi'
import day from 'dayjs'

let users = [];
let messages = [];

const app = express();
app.use(cors());
app.use(express.json());
app.listen(5000, () => console.log('Running on port 5000'));

function remove(){
    const now = Date.now();
    const newUsers = [];
    for (let a = 0; a < users.length; a++){
        if (now - users[a].lastStatus <= 10){
            newUsers.push(users[a]);
        }
        else{
            const objMessage = {from: users[a].name, to: 'Todos', text: 'sai da sala...', type: 'status', time: day().format('HH:mm:ss')}
            messages.push(objMessage);
        }
    }
    users = newUsers;
}

setInterval(remove, 15000);

app.post('/participants', (req, res) => {
    const data = req.body;
    const user = data.name;
    const expectedName = joi.string();
    // Faz a validação do userName
    const { error, value } = expectedName.validate(user);
    if (error == undefined){
        function right(name){
            const objMessage = {from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: day().format('HH:mm:ss')};
            messages.push(objMessage);
            const objName = {name: name, lastStatus: Date.now()};
            users.push(objName);
            res.sendStatus(201);
        }
        if (users.length > 0){
            for(let a = 0; a < users.length; a++){
                if (users[a].name == user){
                    res.sendStatus(409);
                    break;
                }
                else if (a == users.length - 1 && users[a] != user){
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
})

app.get('/participants', (req, res) => {
    res.send(users);
})