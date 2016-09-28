
'use strict';

const config = require('./config.json');
const token = config.token;
process.env.token = token;
if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('./lib/Botkit.js');
var os = require('os');

var controller = Botkit.slackbot({
    debug: true
});

var bot = controller.spawn({
    token: process.env.token
}).startRTM();


controller.hears(['hello', 'hi'], 'direct_message,direct_mention,mention', function(bot, message) {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'robot_face',
    }, function(err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(', err);
        }
    });


    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            bot.reply(message, 'Hello ' + user.name + '!!');
        } else {
            bot.reply(message, 'Hello.');
        }
    });
});

controller.hears(['call me (.*)', 'my name is (.*)'], 'direct_message,direct_mention,mention', function(bot, message) {
    var name = message.match[1];
    controller.storage.users.get(message.user, function(err, user) {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        user.name = name;
        controller.storage.users.save(user, function(err, id) {
            bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
        });
    });
});

controller.on('file_share', function(bot, message){
    'use strict';
    const co = require('co');
    const request = require('request');
    const channelID = message.channel;

    co(function * (){
        try{
            const channelName = yield getChannelName(token, channelID);
            const fileInfo = message.file;
            const content = yield download(fileInfo.url_private_download, token);
            yield uploadToS3(content, fileInfo, channelName);
        }catch(e){
            throw new Error(e);
        }
    }).then(function(){
        bot.reply(message, 'さぁ～どんどんしまっちゃおうねぇ～');
    }).catch(function(e){
        console.log(e);
        bot.reply(message, 'すまんな');
    });

    function getChannelName(token, channelID) {
        var apiURL = 'https://slack.com/api/';
        var attribute;
        if(channelID.charAt(0) === "C"){
            apiURL += "channels.info?";
            attribute = "channel";
        }else if(channelID.charAt(0) === "G"){
            apiURL += "groups.info?";
            attribute = "group";
        }else{
            return "undefined";
        }

        apiURL += ('token=' + token);
        apiURL += ('&channel=' + channelID);
        return new Promise(function(resolve, reject){
            request({method: 'get',
                url:apiURL,
                encoding: null
            }, function(error, response, body){
                if(!error && response.statusCode === 200){
                    let result = JSON.parse(body.toString());
                    resolve(result[attribute].name);
                }else{
                    reject(error);
                }
            })
        });
    }

    function download(url, token){
        return new Promise(function(resolve, reject){
            request({method: 'get',
                url:url,
                encoding: null,
                headers: {Authorization: "Bearer " + token}
            },function(error, response, body){
                if(error){
                    reject(error);
                }else{
                    resolve(body);
                }
            })
        });
    }

    function uploadToS3(content, fileInfo, channelName){
        const AWS = require('aws-sdk');
        AWS.config.update({
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
            region: config.region
        });
        const BUCKET = config.bucket;
        const s3 = new AWS.S3({params: {Bucket: BUCKET}});
        const moment = require('moment');
        return new Promise(function(resolve, reject){
            s3.upload({
                Key:  channelName + '/' + moment().format('YYYYMMDD') + '/' + fileInfo.name,
                Body: content,
                ContentType: fileInfo.mimetype
            },function(error, data){
                if(error){
                    reject(error);
                }else{
                    resolve(data);
                }
            });
        });
    }

});

controller.hears(['what is my name', 'who am i'], 'direct_message,direct_mention,mention', function(bot, message) {

    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            bot.reply(message, 'Your name is ' + user.name);
        } else {
            bot.startConversation(message, function(err, convo) {
                if (!err) {
                    convo.say('I do not know your name yet!');
                    convo.ask('What should I call you?', function(response, convo) {
                        convo.ask('You want me to call you `' + response.text + '`?', [
                            {
                                pattern: 'yes',
                                callback: function(response, convo) {
                                    // since no further messages are queued after this,
                                    // the conversation will end naturally with status == 'completed'
                                    convo.next();
                                }
                            },
                            {
                                pattern: 'no',
                                callback: function(response, convo) {
                                    // stop the conversation. this will cause it to end with status == 'stopped'
                                    convo.stop();
                                }
                            },
                            {
                                default: true,
                                callback: function(response, convo) {
                                    convo.repeat();
                                    convo.next();
                                }
                            }
                        ]);

                        convo.next();

                    }, {'key': 'nickname'}); // store the results in a field called nickname

                    convo.on('end', function(convo) {
                        if (convo.status == 'completed') {
                            bot.reply(message, 'OK! I will update my dossier...');

                            controller.storage.users.get(message.user, function(err, user) {
                                if (!user) {
                                    user = {
                                        id: message.user,
                                    };
                                }
                                user.name = convo.extractResponse('nickname');
                                controller.storage.users.save(user, function(err, id) {
                                    bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
                                });
                            });



                        } else {
                            // this happens if the conversation ended prematurely for some reason
                            bot.reply(message, 'OK, nevermind!');
                        }
                    });
                }
            });
        }
    });
});


controller.hears(['shutdown'], 'direct_message,direct_mention,mention', function(bot, message) {

    bot.startConversation(message, function(err, convo) {

        convo.ask('Are you sure you want me to shutdown?', [
            {
                pattern: bot.utterances.yes,
                callback: function(response, convo) {
                    convo.say('Bye!');
                    convo.next();
                    setTimeout(function() {
                        process.exit();
                    }, 3000);
                }
            },
        {
            pattern: bot.utterances.no,
            default: true,
            callback: function(response, convo) {
                convo.say('*Phew!*');
                convo.next();
            }
        }
        ]);
    });
});


controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
    'direct_message,direct_mention,mention', function(bot, message) {

        var hostname = os.hostname();
        var uptime = formatUptime(process.uptime());

        bot.reply(message,
            ':robot_face: I am a bot named <@' + bot.identity.name +
             '>. I have been running for ' + uptime + ' on ' + hostname + '.');

    });

function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}
