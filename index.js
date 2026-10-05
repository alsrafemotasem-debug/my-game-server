            // الدخول كضيف (Guest)
            else if (data.type === "guest") {
                const guestUser = {
                    id: Math.floor(Math.random() * 900000) + 100000,
                    username: "Guest_" + Math.floor(Math.random() * 1000),
                    provider: "guest",
                    friends: [],
                    requests: []
                };
                usersDatabase.push(guestUser);
                ws.id = guestUser.id;
                ws.username = guestUser.username;
                
                ws.send(JSON.stringify({
                    type: "login_ok",
                    user: { id: guestUser.id, username: guestUser.username, provider: "guest" },
                    friends: [],
                    requests: []
                }));
            }
