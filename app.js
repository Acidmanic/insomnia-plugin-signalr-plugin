
const signalR = require("@microsoft/signalr");

const sharedComponentData = {
    log: t => {},
    information : []
};

module.exports.sharedComponentData = sharedComponentData;


module.exports.requestGroupActions = [
    {
        label: 'SignalR-Client',
        icon: 'fa-star',
        action: async (context, data) => {



            function debug(object){

                const dooo = `<code>${JSON.stringify(object)}</code>`;

                context.app.showGenericModalDialog('biz',{html:dooo});

            }

            async function acquireRequestInformation() {

                sharedComponentData.information = [];

                const { requests } = data;

                for (const r of requests) {

                    if (r.method && r.method.toLocaleLowerCase() == 'signalr') {
                        
                        try {
                            const response = await context.network.sendRequest(r);
                        } catch (error) {}
                    }
                }
            }

        

            let mainWindow = document.createElement('div');

            let header = document.createElement('div');

            header.style.alignContent = 'center';
            header.style.alignItems = 'center';
            header.style.textAlign = 'center';

            let body = document.createElement('div');

            body.style.border = '1px solid #000';
            body.style.borderRadius = '3px';

            mainWindow.appendChild(header);
            mainWindow.appendChild(body);


            

            await acquireRequestInformation();
            
            
            let availableInformation = sharedComponentData.information;
            

            async function dialogInformation(information){
                

                body.innerHTML = "";

                let title = document.createElement('h3');

                title.innerText = information.requestName;

                title.style.width = '100%';
                title.style.alignContent = 'center';
                title.style.alignItems = 'center';
                title.style.textAlign = 'center';
                title.style.padding = '2%';
                title.style.width = '95%';

                body.appendChild(title);

                let clientWindow = await createClientWindow(information);

                body.appendChild(clientWindow);

                //await context.app.dialog('Stream SignalR', html);
            }


            function informationToTabButton(information){

                return {name:information.requestName, click: async ()=>await dialogInformation(information)};
            }

            let tabs = availableInformation.map( i => informationToTabButton(i));

            let tabButtons = createButtonRow(...tabs);

            header.appendChild(tabButtons);

        
            await context.app.dialog('Stream SignalR', mainWindow);


            async function createClientWindow(information) {



                let html = document.createElement('div');

                let cssString = 'pre {outline: 1px solid #ccc; padding: 5px; margin: 5px; }';
                cssString += '.string { color: #AAFFBB; }';
                cssString += '.number { color: #FFFFBB; }';
                cssString += '.boolean { color: #1111BB; }';
                cssString += '.null { color: #1111BB; }';
                cssString += '.key { color: #8888BB; }';

                let css = document.createElement('style');

                css.innerHTML = cssString;

                html.appendChild(css);

                let buttons = createButtonRow({ name: 'Start Listening', click: ()=>startClicked(information) }, { name: 'Stop', click: stopClicked }, { name: 'ClearLogs', click: clearLogs })

                html.appendChild(buttons);

                let output = document.createElement('div');
                output.style.margin = '5%';
                output.style.width = '90%';

                html.appendChild(output);


                

                function clearLogs() {

                    output.innerHTML = "";
                }
    
                function log(text) {
    
                    let p = document.createElement('p');
    
                    p.innerHTML = text;
    
                    p.style.margin = '2px';
                    p.style.padding = '2px';
    
                    output.appendChild(p);
                }
    
                function outputData(information, value) {
    
                    let dataHtml = syntaxHighlight(value);
    
                    if (information && information.lastMessageOnly == true) {
    
                        output.innerHTML = "";
                    }
    
                    log(dataHtml);
    
                }
    
                function syntaxHighlight(json) {
                    if (typeof json != 'string') {
                        json = JSON.stringify(json, undefined, 2);
                    }
                    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                        var cls = 'number';
                        if (/^"/.test(match)) {
                            if (/:$/.test(match)) {
                                cls = 'key';
                            } else {
                                cls = 'string';
                            }
                        } else if (/true|false/.test(match)) {
                            cls = 'boolean';
                        } else if (/null/.test(match)) {
                            cls = 'null';
                        }
                        return '<span class="' + cls + '">' + match + '</span>';
                    });
                }



                var connection;

                let subscription;


                async function start(information) {

                    log('Starting');

                    try {
                        await connection.start();
                        log("SignalR Connected.");

                        connection.onclose(async () => {
                            //await start();

                            log('Connection closed');

                            stopClicked();
                        });

                    } catch (err) {

                        log(JSON.stringify(err));

                        // if(keepTryingToConnect==true){
                        //     setTimeout(start, 5000);
                        // }

                        stopClicked();
                    }

                    let methodName = information.method;

                    subscription = connection.stream(methodName)
                        .subscribe({
                            next: (item) => {
                                outputData(information, item);
                            },
                            complete: () => {
                                log('Done');
                            },
                            error: (err) => {

                                for (const key in error) {
                                    log('error subscribing to method: ' + methodName + ':');
                                    log(JSON.stringify(err));
                                    break;
                                }

                            },
                        });

                    connection.on(methodName, (...args) => {

                        outputData(information, args);
                    });


                }


                async function startClicked(information) {

                    let url = information.url;

                    if (url && url.length > 0) {

                        try {

                            if (information.authorizationToken) {

                                log('Connect with authentication (by token)');
                                log(information.authorizationToken);

                                connection = new signalR.HubConnectionBuilder()
                                    .withUrl(url, { accessTokenFactory: () => information.authorizationToken })
                                    .build();

                            } else {

                                log('Connect anonymously to ' + url );

                                connection = new signalR.HubConnectionBuilder()
                                    .withUrl(url)
                                    .build();

                                    log('----');

                            }

                            await start(information);

                        } catch (error) {

                            if (error) {
                                for (const key in error) {

                                    log(JSON.stringify(error));
                                    break;
                                }
                            }

                        }
                    } else {

                        log('You Must have a Request of type: SIGNALR with json body containing the url and method properties');
                    }


                }

                async function stopClicked() {

                    if (subscription) {
                        try {

                            subscription.unsubscribe();

                        } catch (error) {

                        }
                    }

                    if (connection) {

                        try {

                            connection.stop();

                        } catch (err) {

                        }
                    }

                    log('Stopped');

                }

                return html;
            }

            function createButtonRow(...buttonParameters) {

                let row = document.createElement('div');

                for (const buttonParameter of buttonParameters) {

                    let button = document.createElement('input');

                    button.type = 'button';

                    button.value = buttonParameter.name;

                    button.addEventListener('click', ev => buttonParameter.click());

                    row.appendChild(button);

                    button.style.marginLeft = '10px';
                    button.style.marginRight = '10px';
                    button.style.padding = '10px';
                    button.style.cursor = 'pointer';
                    button.style.background = '#222222';
                    button.style.borderRadius = '3px';
                }

                row.style.margin = '10px';
                row.style.padding = '10px';
                row.style.alignContent = 'center';
                row.style.alignItems = 'center';
                row.style.textAlign = 'center';

                return row;
            }


            
        }
    }
];


module.exports.requestHooks = [

        context => {

            let method =  context.request.getMethod();

            if (method && method.toLocaleLowerCase() == 'signalr') {

                let requestData = JSON.parse(context.request.getBody().text);
    
                sharedComponentData.information.push({...requestData,requestName:context.request.getName()})

                //context.request.setMethod('get');
                context.request.setBody({});
                context.request.setUrl(requestData.url);
    
            }

        }
];

const jsonObjToBuffer = obj => Buffer.from(JSON.stringify(obj), 'utf-8');

module.exports.responseHooks = [
    async context => {
    
        let method =  context.request.getMethod();

        if (method && method.toLocaleLowerCase() == 'signalr') {

            context.response.setBody(jsonObjToBuffer({"message":"Please Use The plugin to consume a Signal-R Hub"}));
        }
    }
  ]