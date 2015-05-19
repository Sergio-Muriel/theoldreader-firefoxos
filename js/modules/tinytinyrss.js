var Tinytinyrss = function()
{
    var self=this;
    this.type='tinytinyrss';
    this.username = null;
    this.password = null;

    this.all_id  = 'user/-/state/com.google/reading-list';
    this.starred_id  = 'user/-/state/com.google/starred';
    this.liked_id = 'user/-/state/com.google/like';
    this.shared_id = 'user/-/state/com.google/broadcast';

    this.form = document.querySelector('.tinytinyrss form');
    this.login_link = document.querySelector('.tinytinyrss .login_link');
    this.logout_link = document.querySelector('.tinytinyrss .logout_link');
    this.user = this.form.querySelector('input[name=user]');
    this.url = this.form.querySelector('input[name=url]');
    this.password = this.form.querySelector('input[name=password]');

    // Init XHR object
    this.xhr = new XMLHttpRequest({ mozSystem: true });

    // Init indexed DB
    var db_request = indexedDB.open('tinytinyrss');
    db_request.onsuccess = function (e) { self.db = e.target.result; };
    db_request.onerror = function (e) { console.log(e); };
};


Tinytinyrss.prototype.init = function()
{
    var self=this;
    if(!self.inited)
    {
        // Bind buttons
        this.form.addEventListener('submit', function(e) { return self.login(e); }, false);
        this.login_link.addEventListener('submit', function(e) { return self.login.bind(self)(e); }, false);
        this.logout_link.addEventListener('click', function(e) { return self.logout.bind(self)(e); }, false);
    }
    self.inited=1;

    return Promise.all([
            this.initDb()
    ]);
};
Tinytinyrss.prototype.logout = function(e)
{
    this.deleteAccount(this.loggedout.bind(this));
    settings.logout();
    e.preventDefault();
}

Tinytinyrss.prototype.login= function(e)
{
    var self=this;
    if(this.form.checkValidity())
    {
        e.preventDefault();

        this._login(this.user.value,this.password.value)
            .then(
                settings.init_accounts.bind(settings),
                function()
                {
                    alert(translate('login_fail'));
                });
    }
    else
    {
        e.preventDefault();
        return false;
    }
};

Tinytinyrss.prototype.initDb = function()
{
    var self=this;
    return new Promise(function(ok, reject)
    {
        var request = indexedDB.open('tinytinyrss_db',2.3);
        request.onsuccess = function (e) {
            self.db = e.target.result;
            ok();
        }
        request.onerror = function (e) {
            console.log(e);
            reject();
        };
        request.onupgradeneeded = function (e) {
            self.db = e.target.result;

            if (self.db.objectStoreNames.contains("labels")) {
                self.db.deleteObjectStore("labels");
            }
            if (self.db.objectStoreNames.contains("accounts")) {
                self.db.deleteObjectStore("accounts");
            }
            if (self.db.objectStoreNames.contains("feeds")) {
                self.db.deleteObjectStore("feeds");
            }
            if (self.db.objectStoreNames.contains("counts")) {
                self.db.deleteObjectStore("counts");
            }
            if (self.db.objectStoreNames.contains("items")) {
                self.db.deleteObjectStore("items");
            }

            var objectStore = self.db.createObjectStore('accounts', { keyPath: 'id', autoIncrement: true });

            var objectStore = self.db.createObjectStore('feeds', { keyPath: 'id', autoIncrement: true });

            var objectStore = self.db.createObjectStore('counts', { keyPath: 'id', autoIncrement: true });

            var objectStore = self.db.createObjectStore('items', { keyPath: 'id', autoIncrement: true });

            var objectStore = self.db.createObjectStore('labels', { keyPath: 'id', autoIncrement: true });
            objectStore.createIndex("sortid", "sortid", { unique: false });
            objectStore.createIndex("id", "id", { unique: false });
        };
    });

};

// Methodes
Tinytinyrss.prototype._login = function(user, password)
{
    var self=this;
    return new Promise(function(ok, reject)
    {
        var r = self.xhr;
        r.open("POST", self.url.value+'/api/', true);
        console.log(self.url.value);
        r.setRequestHeader("Content-type","application/x-www-form-urlencoded");
        r.onreadystatechange = function () {
            if (r.readyState == 4)
            {
                var data = JSON.parse(r.responseText);
                if(data.content && data.content.error && data.content.erro!=='LOGIN_ERROR')
                {
                    alert('ERROR: '+data.content.error);
                    reject();
                }
                else if(data.content.session_id)
                {
                    self.create_account(self.url.value, self.user.value, data.content.session_id)
                        .then(ok);
                }
                else
                {
                    reject();
                }

            }
        };

        // Send xhr request
        r.send(JSON.stringify({ op : 'login', user: user, password: password }));
    });
};

Tinytinyrss.prototype.loggedin = function()
{
    this.user.value = this.getUser();
    this.form.classList.add("loggedin");
    this.user.disabled=true;
    this.url.disabled=true;
};

Tinytinyrss.prototype.loggedout = function()
{
    this.form.classList.remove("loggedin");
    this.user.disabled=false;
    this.url.disabled=false;
};

Tinytinyrss.prototype.create_account = function(host, user, session)
{
    var self=this;
    return new Promise(function(ok, reject)
    {
        var transaction = self.db.transaction([ 'accounts' ], 'readwrite');
        //Create the Object to be saved i.e. our Note
        var value = {};
        value.host = host;
        value.user = user;
        value.session = session;

        var accounts = transaction.objectStore('accounts');
        var request = accounts.add(value);
        request.onsuccess = function (e) {
            ok();
        };
        request.onerror = function (e) {
            reject();
        }
    });
};

Tinytinyrss.prototype.getAccount = function(callback)
{
    var account = null;
    var self=this;

    var transaction = this.db.transaction([ 'accounts' ]);
    var dbaccounts = transaction.objectStore('accounts');

    // open a cursor to retrieve all items from the 'notes' store
    dbaccounts.openCursor().onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) {
            self.account = cursor.value;
            cursor.continue();
        }
        else
        {
            callback(self.account);
        }
    };
}

Tinytinyrss.prototype.getUser = function()
{
    return this.account  ? this.account.user : '';
};




Tinytinyrss.prototype.deleteAccount = function(callback)
{
    if(this.account)
    {
        var request = this.db.transaction(["accounts"], "readwrite")
            .objectStore("accounts")
            .delete(this.account.id);
        request.onsuccess = function(event) {
            callback();
        }
        this.account=null;
    }
};

Tinytinyrss.prototype.isLoggedIn = function(callback)
{
    if(!this.account)
    {
        return false;
    }
    return true;
};

Tinytinyrss.prototype._query = function(method,url,data,callback)
{
    var self=this;
    return new Promise(function(ok, reject)
    {
        if(!self.account || !self.account.token)
        {
            reject();
        }

        // Init XHR object
        var r = new XMLHttpRequest({ mozSystem: true });
        r.open(method, url, true);
        r.setRequestHeader("Content-type","application/x-www-form-urlencoded");
        r.setRequestHeader("authorization","GoogleLogin auth="+self.account.token);

        r.onreadystatechange = function () {
            if (r.readyState == 4)
            {
                if(r.status == 200)
                {
                    return ok(r.responseText);
                }
                else
                {
                    return reject(null);
                }
            }
            else
            {
            }
        };
        r.send(data);
    });
};



Tinytinyrss.prototype.updateSubscriptionList = function()
{
    var self=this;
    return new Promise(function(ok, reject)
    {
        var url = self.host+'/reader/api/0/subscription/list?output=json';
        self._query.bind(self)("GET", url, null)
            .then(function(text)
            {
                var data = JSON.parse(text);
                if(data)
                {
                    self.addSubscriptions(data.subscriptions)
                        .then(ok, reject);
                }
                else
                {
                    reject();
                }   
            }, reject);
    });
}
Tinytinyrss.prototype.addSubscriptions = function(subscriptions)
{
    var self=this;
    return new Promise(function(ok, reject)
    {
        var transaction_feeds = self.db.transaction([ 'feeds' ], 'readwrite');
        transaction_feeds.oncomplete= ok;
        transaction_feeds.onerror= reject;

        // Remove previous feeds
        var allfeeds = transaction_feeds.objectStore('feeds');
        allfeeds.clear();

        //Create the Object to be saved i.e. our Note
        subscriptions.forEach(function(data)
        {
            var feeds = transaction_feeds.objectStore('feeds');
            data.category = data.categories.length>0 ?  data.categories[0].id : '';
            var request = feeds.add(data);
        });
    });
};

Tinytinyrss.prototype.updateLabelsList = function()
{
    var self=this;
    return new Promise(function(ok, reject)
    {
        var url = self.host+'/reader/api/0/tag/list?output=json';
        self._query.bind(self)("GET", url, null)
            .then(function(text)
            {
                var data = JSON.parse(text);
                if(data)
                {
                    self.addLabels(data.tags)
                        .then(ok, reject);
                }
                else
                {
                    reject();
                }
            }, reject);
    });
}
Tinytinyrss.prototype.addLabels = function(labels)
{
    var self=this;
    return new Promise(function(ok, reject)
    {
        var transaction_labels = self.db.transaction([ 'labels' ], 'readwrite');
        //Create the Object to be saved i.e. our Note
        transaction_labels.oncomplete= ok;
        transaction_labels.onerror= reject;

        // Remove previous labels
        var alllabels = transaction_labels.objectStore('labels');
        alllabels.clear();

        labels.forEach(function(data)
        {
            var labels = transaction_labels.objectStore('labels');
            var request = labels.add(data);
        });
    });
};

Tinytinyrss.prototype.updateCount = function()
{
    var self=this;
    return new Promise(function(ok, reject)
    {
        var url = self.host+'/reader/api/0/unread-count?output=json';
        self._query.bind(self)("GET", url, null)
            .then(function(text)
            {
                var data = JSON.parse(text);
                if(data)
                {
                    self.addCounts(data.unreadcounts)
                        .then(ok, reject);
                }
                else
                {
                    reject();
                }
            }, reject);
    });
}

Tinytinyrss.prototype.addCounts = function(counts)
{
    var self=this;
    return new Promise(function(ok, reject)
    {
        var transaction_counts = self.db.transaction([ 'counts' ], 'readwrite');
        //Create the Object to be saved i.e. our Note
        transaction_counts.oncomplete= ok;
        transaction_counts.onerror= reject;

        // Remove previous counts
        var allcounts = transaction_counts.objectStore('counts');
        allcounts.clear();

        counts.forEach(function(data)
        {
            var counts = transaction_counts.objectStore('counts');
            var request = counts.add(data);
        });
    });
};

Tinytinyrss.prototype.fullupdate = function()
{
    return Promise.all([
            this.updateSubscriptionList(),
            this.updateLabelsList(),
            this.updateCount()
    ]);
};

Tinytinyrss.prototype.getFeeds = function()
{
    var self=this;
    return new Promise(function(ok, reject)
    {
        var feeds = [];

        var transaction = self.db.transaction([ 'feeds' ]);
        var dbfeeds = transaction.objectStore('feeds');

        // open a cursor to retrieve all items from the 'notes' store
       var c = dbfeeds.openCursor();
       c.onsuccess = function (e) {
            var cursor = e.target.result;
            if (cursor) {
                if(!/sponsored/.test(cursor.value.id))
                {
                    feeds.push(cursor.value);
                }
                cursor.continue();
            }
            else
            {
                ok(feeds);
            }
        };
       c.onerror = reject;
    });
}

Tinytinyrss.prototype.getLabels = function()
{
    var self=this;
    return new Promise(function(ok, reject)
    {
        var labels = [];

        var transaction = self.db.transaction([ 'labels' ]);
        var dblabels = transaction.objectStore('labels');
        var index = dblabels.index('id');

        // open a cursor to retrieve all items from the 'notes' store
       var c = index.openCursor();
       c.onsuccess = function (e) {
            var cursor = e.target.result;
            if (cursor) {
                if(/label/.test(cursor.value.id))
                {
                    labels.push(cursor.value);
                }
                cursor.continue();
            }
            else
            {
                ok(labels);
            }
        };
       c.onerror = reject;
    });
};

Tinytinyrss.prototype.getCounts = function()
{
    var self=this;
    return new Promise(function(ok, reject)
    {
        var counts = [];

        var transaction = self.db.transaction([ 'counts' ]);
        var dbcounts = transaction.objectStore('counts');

        // open a cursor to retrieve all items from the 'notes' store
       var c = dbcounts.openCursor();
       c.onsuccess = function (e) {
            var cursor = e.target.result;
            if (cursor) {
                counts.push(cursor.value);
                cursor.continue();
            }
            else
            {
                ok(counts);
            }
        };
       c.onerror = reject;
    });
}

Tinytinyrss.prototype.getItems = function(id, viewRead, next)
{
    var self=this;
    return new Promise(function(ok, reject)
    {
        var items=[];
        var ids=[];
        var url = self.host+'/reader/api/0/stream/items/ids?output=json&s='+id;
        if(!viewRead)
        {
            url+='&xt=user/-/state/com.google/read';
        }
        if(next)
        {
            url+='&c='+next;
        }

        self._query.bind(self)("GET", url, null)
            .then(function(text)
            {
                var items = JSON.parse(text);
                if(items)
                {
                    var itemids = items.itemRefs;
                    var url = self.host+'/reader/api/0/stream/items/contents?output=json';
                    itemids.forEach(function(item)
                    {
                        url+='&i='+item.id;
                    });
                    console.log('fetch ',url);
                    self._query.bind(self)("GET", url, null)
                        .then(function(text)
                        {
                            var data = JSON.parse(text);
                            if(data)
                            {
                                data.continuation = items.continuation;
                                if(data.items)
                                {
                                    Array.forEach(data.items, function(item)
                                    {
                                        item.starred = item.categories.indexOf('user/-/state/com.google/starred')!==-1;
                                        item.liked = item.categories.indexOf('user/-/state/com.google/like')!==-1;
                                        item.unread = item.categories.indexOf('user/-/state/com.google/fresh')!==-1;
                                    });
                                }
                                ok(data);
                            }
                            else
                            {
                                reject();
                            }
                        }, reject);

                }
                else
                {
                    reject();
                }
            }, reject);
    });
}

Tinytinyrss.prototype.markRead= function(item_id, state)
{
    var self=this;
    return new Promise(function(ok, reject)
    {
        var url = self.host+'/reader/api/0/edit-tag?output=json';

        var data='i='+item_id;
        data+= (state ? '&a=' : '&r=');
        data+= 'user/-/state/com.google/read';
        self._query.bind(self)("POST", url, data)
            .then(function(text)
            {
                ok(text);
            }, reject);
    });
};

Tinytinyrss.prototype.markLike= function(item_id, state)
{
    var self=this;
    return new Promise(function(ok, reject)
    {
        var url = self.host+'/reader/api/0/edit-tag?output=json';

        var data='i='+item_id;
        data+= (state ? '&a=' : '&r=');
        data+= 'user/-/state/com.google/like';
        self._query.bind(self)("POST", url, data)
            .then(function(text)
            {
                ok(text);
            }, reject);
    });
};

Tinytinyrss.prototype.markStar= function(item_id, state)
{
    var self=this;
    return new Promise(function(ok, reject)
    {
        var url = self.host+'/reader/api/0/edit-tag?output=json';

        var data='i='+item_id;
        data+= (state ? '&a=' : '&r=');
        data+= 'user/-/state/com.google/starred';
        self._query.bind(self)("POST", url, data)
            .then(function(text)
            {
                ok(text);
            }, reject);
    });
}

Tinytinyrss.prototype.readAll= function(item_id)
{
    var self=this;
    return new Promise(function(ok, reject)
    {
        var url = self.host+'/reader/api/0/mark-all-as-read';

        var data='s='+item_id;
        self._query.bind(self)("POST", url, data)
            .then(function(text)
            {
                ok(text);
            }, reject);
    });
}

Tinytinyrss.prototype.addFeed= function(url)
{
    var self=this;
    var addurl = url;
    return new Promise(function(ok, reject)
    {
        var url = self.host+'/reader/api/0/subscription/quickadd';
        var data = 'quickadd='+encodeURIComponent(addurl);

        self._query.bind(self)("POST", url, data)
            .then(function(text)
            {
                var data = JSON.parse(text);
                if(data.error)
                {
                    reject(data);
                }
                else
                {
                    ok(data);
                }
            }, reject);
    });
};
