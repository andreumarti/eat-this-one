var log = require('./log.js');

var DishModel = require('../models/dish.js').model;
var PhotoModel = require('../models/photo.js').model;

function EatDish(eat) {

    this.eat = eat;
    this.attrs = {
        id : {
            validation : ['isNotEmpty', 'isMongoId']
        },
        user : {
            validation : ['isNotEmpty', 'isMongoId']
        },
        groupid : {
            validation : ['isNotEmpty', 'isMongoId']
        },
        photo : {
            validation : ['isBase64']
        },
        name : {
            validation : ['isNotEmpty', 'matches'],
            pattern : this.eat.getStringRegEx()
        },
        description : {
            validation : ['matches'],
            pattern : this.eat.getStringRegEx()
        },
        when : {
            validation : ['isNotEmpty', 'isNumeric']
        },
        nportions : {
            validation : ['isNotEmpty', 'isNumeric']
        },
        donation : {
            validation : ['isNotEmpty', 'isAlphanumeric']
        }
    };
}

/**
 * This only returns basic dish data.
 */
EatDish.prototype.getByUser = function() {

    // Here we will get all dishes from the user group memberships.
    var membershipsCallback = function(error, memberships) {
        if (error) {
            return this.eat.returnCallback(error);
        }

        // As long as the user has an account it is an user so this is a 200.
        if (memberships.length === 0) {
            return this.eat.returnCallback(null, [], 200);
        }

        // In theory just 1 group membership per user, but let's do
        // it for multiple groups as we will need it at some point.
        var groupIds = [];
        memberships.forEach(function(membership) {
            groupIds.push(membership.group);
        });

        // Fetch by group id and return them.
        var filters = {
            group : {
                $in : groupIds
            }, when : {
                $gt : this.eat.getYesterday()
            }
        };
        this.fetch(filters);

    }.bind(this);

    this.eat.getEatGroupMember().fetch({user : this.eat.getUserid()}, membershipsCallback);
};

EatDish.prototype.fetchDish = function(id, includeSensitive, callback) {

    DishModel.findById(id).populate('group').populate('user').exec(function(error, dish) {
        if (error) {
            return callback(error);
        }

        if (!dish) {
            return this.eat.returnCallback({
                code : 404,
                message : 'Not found'
            });
        }

        // We want to add/remove fields and we can not do it in a model.
        dish = dish.toJSON();

        // Skip chef's sensitive data.
        if (includeSensitive === false) {
            dish.user = this.eat.getEatUser().clearPersonalData(dish.user);
        }

        return callback(null, dish);
    }.bind(this));
};

EatDish.prototype.getById = function() {

    var id = this.eat.getParam('id', this.attrs.id.validation);
    if (id === false) {
        return this.eat.returnCallback({
            code: 400,
            message: 'Bad request'
        });
    }

    // Specific query as we need to populate group and chef.
    this.fetchDish(id, false, function(error, dish) {
        if (error) {
            return this.eat.returnCallback(error);
        }
        this.getDishExtraData(dish);

    }.bind(this));
};

EatDish.prototype.add = function() {

    var dish = {};
    dish = this.fillDish(dish);
    if (dish === false) {
        return this.eat.returnCallback({
            code: 400,
            message: 'Bad request'
        });
    }

    // Add the group.
    dish.group = this.eat.getParam(
        'groupid',
        this.attrs.groupid.validation
    );
    if (dish.group === false) {
        return this.eat.returnCallback({
            code: 400,
            message: 'Bad request'
        });
    }

    // Set the user.
    dish.user = this.eat.getUserid();

    var dishInstance = new DishModel(dish);

    // Here we check that the user can add to that group.
    var accessCheckedCallback = function(error, memberships) {
        if (error) {
            return this.eat.returnCallback(error);
        }

        if (memberships.length === 0) {
            return this.eat.returnCallback({
                code : 401,
                message : 'You are not a member of this group'
            });
        }

        var hasAccess = false;
        memberships.forEach(function(membership) {
            if (membership._id.equals(dish.group._id)) {
                hasAccess = true;
            }
        });

        // Save the dish.
        this.save(dishInstance, 201, savedCallback);

    }.bind(this);

    // Here we will proceed to save the dish.
    var savedCallback = function(error, dish) {
        if (error) {
            return this.eat.returnCallback(error);
        }

        this.countUserDishes(dish, notificationsCallback);

    }.bind(this);

    // Here we will send the notifications to the members.
    var notificationsCallback = function(error, dish) {
        if (error) {
            return this.eat.returnCallback(error);
        }

        this.sendNotifications(dish);

    }.bind(this);

    this.eat.getEatGroupMember().fetch({user : this.eat.getUserid(), group: dish.group}, accessCheckedCallback);
};

EatDish.prototype.update = function() {

    var id = this.eat.getParam(
        'id',
        this.attrs.id.validation,
        this.attrs.id.pattern
    );
    if (id === false) {
        return this.eat.returnCallback({
            code: 400,
            message: 'Bad request'
        });
    }

    // We also check that the user is the dish chef.
    var filters = {_id : id, user : this.eat.getUserid()};

    // Here we will update the dish data.
    var dishCallback = function(error, dishes) {
        if (error) {
            return this.eat.returnCallback(error);
        }

        if (dishes.length === 0) {
            return this.eat.returnCallback({
                code : 400,
                message : 'Unexisting dish'
            });
        }

        // Get the existing data.
        var dish = dishes[0];

        // Overwrite only a few values.
        dish = this.fillDish(dish);
        if (dish === false) {
            return this.eat.returnCallback({
                code: 400,
                message: 'Bad request'
            });
        }
        dish.modified = new Date();

        this.save(dish, 200);

    }.bind(this);

    this.fetch(filters, dishCallback);
};

EatDish.prototype.fetch = function(filters, callback) {
    if (typeof callback === 'undefined') {
        callback = this.eat.returnCallback.bind(this.eat);
    }

    // When getting dishes we force the order by time created.
    var extra = {sort : {'created' : -1}};
    DishModel.find(filters, {}, extra, function(error, dishes) {
        if (error) {
            return callback(error);
        }

        return callback(null, dishes);
    }.bind(this));
};

EatDish.prototype.save = function(dish, successStatusCode, callback) {
    if (typeof callback === 'undefined') {
        callback = this.eat.returnCallback.bind(this.eat);
    }

    dish.save(function(error) {
        if (error) {
            return callback(error);
        }

        // Now save the photo if there is one.
        var photo = this.eat.getParam(
            'photo',
            this.attrs.photo.validation
        );

        // If there is any problem with the photo content
        // we just continue the process to return a success
        // and forget about the error :P.
        if (photo !== false) {
            // We will save the photo in background.
            if (this.eat.hasValue(photo)) {
                this.savePhoto(photo, dish);
            }
        } else {
            // Log the error.
            log(
                'error',
                'Wrong photo content, so we do not store it',
                this.eat,
                error
            );
        }

        // In case the value exists (previous value or savePhoto()
        // already finished), it is too big to be returned now.
        delete dish.photoid;

        // Here we have all data and we return it.
        var doneCallback = function(error, dish) {
            if (error) {
                return this.eat.returnCallback(error);
            }
            return callback(null, dish, successStatusCode);
        }.bind(this);

        // We get both group and chef.
        this.fetchDish(dish._id, false, doneCallback);

    }.bind(this));
};

EatDish.prototype.getDishExtraData = function(dish) {

    // Here we will get the number of booked meals and the photo.
    var bookedMealsCallback = function(error, bookedmeals) {
        if (error) {
            return this.eat.returnCallback(error);
        }

        // Has the current user booked this dish?
        dish.booked = false;
        bookedmeals.forEach(function(meal) {
            if (meal.user.equals(this.eat.getUserid())) {
                dish.booked = true;
                return;
            }
        }.bind(this));

        // Frontend will count the remaining portions.
        dish.nbookedmeals = bookedmeals.length;

        // We need to get the photo data if there is any.
        if (!this.eat.hasValue(dish.photoid)) {

            // We just check the access and return the dish.
            return this.checkUserAccess(dish);

        } else {
            PhotoModel.findById(dish.photoid, function(error, photo) {
                if (error) {
                    return this.eat.returnCallback(error);
                }
                dish.photo = "data:image/jpeg;base64," + photo.data;

                // Check the access and return the dish.
                return this.checkUserAccess(dish);
            }.bind(this));
        }
    }.bind(this);

    // Get the dish meals and after that the photo if there is one.
    this.eat.getEatMeal().fetch(null, {dish : dish._id}, false, bookedMealsCallback);
};

EatDish.prototype.checkIsOwnDish = function(error, dishid, callback) {
    if (typeof callback === 'undefined') {
        callback = this.eat.returnCallback.bind(this.eat);
    }

    if (error) {
        return this.eat.returnCallback(error);
    }

    var filters = {
        _id : dishid,
        user : this.eat.getUserid()
    };
    DishModel.find(filters, function(error, dishes) {
        if (error) {
            return this.eat.returnCallback(error);
        }
        if (dishes.length === 0) {
            return callback(null, false);
        }
        return callback(null, true);
    }.bind(this));
};

EatDish.prototype.countUserDishes = function(dish, callback) {
    if (typeof callback === 'undefined') {
        callback = this.eat.returnCallback.bind(this.eat);
    }

    // We save the user and later we notify members.
    DishModel.count({user : this.eat.getUserid()}, function(error, count) {
        if (error) {
            return callback(error);
        }

        dish.user.dishescount = count;
        return callback(null, dish);
    }.bind(this));
};

EatDish.prototype.sendNotifications = function(dish) {

    // Here dish.group is the groupid, not an object.
    this.eat.getEatGroupMember().fetch({group : dish.group}, function(error, memberships) {

        // Everything is done so we should return the dish, but
        // log the problem getting the group members.
        if (error) {
            return this.eat.returnCallback(null, dish, 201);
        }

        if (memberships.length === 0) {
            dish.nmembers = 0;
            return this.returnDish(dish, 201);
        }

        // Here we also include the chef as we need it later for falling
        // back if the message is wrong.
        var membershipsIds = [];
        memberships.forEach(function(membership) {
            membershipsIds.push(membership.user);
        });

        var filters = { _id : { $in : membershipsIds }};
        this.eat.getEatUser().fetch(filters, function(error, users) {
            if (error) {
                dish.nmembers = 0;
                return this.eat.returnCallback(null, dish, 201);
            }

            // Notify about the new dish.
            var pusher = require('../lib/pusher.js');
            pusher.sendNotifications(
                this.eat,
                users,
                "newdish",
                dish._id.valueOf(),
                'dishes/view.html?id=' + dish._id.valueOf()
            );

            // All good, so we notify and finish.
            dish.nmembers = users.length;
            return this.returnDish(dish, 201);

        }.bind(this));
    }.bind(this));
};

/**
 * Saves the photo in background.
 *
 * We just store the data and save the reference on the dish.
 *
 * Here we can just log an error as we can not return
 * any error.
 */
EatDish.prototype.savePhoto = function(photoData, dish) {

    var photo = new PhotoModel({ data : photoData });
    photo.save(function(error) {
        if (error) {
            log(
                this.eat,
                'error',
                'Error storing ' + dish._id + ' dish photo',
                error
            );
        } else {

            // Update the dish with a reference to the photo.
            dish.photoid = photo._id;
            dish.save(function(error) {
                // We will return an OK, but we need to log the error for internal investigation.
                if (error) {
                    log('error', dish._id + ' dish photo can not be stored', this.eat, error);
                }
            }.bind(this));
        }
    }.bind(this));
};

EatDish.prototype.checkUserAccess = function(dish, callback) {

    // If no callback just finish.
    if (typeof callback === 'undefined') {
        callback = this.eat.returnCallback.bind(this.eat);
    }

    var userAccessCallback = function(error, memberships) {
        if (error) {
            return callback(error);
        }

        var hasAccess = false;
        memberships.forEach(function(membership) {
            if (dish.group._id.equals(membership.group)) {
                hasAccess = true;
            }
        });

        if (hasAccess === false) {
            return callback({
                code : 401,
                message : 'No access'
            });
        }

        callback(null, dish);

    }.bind(this);

    this.eat.getEatGroupMember().fetch({user : this.eat.getUserid()}, userAccessCallback);
};

EatDish.prototype.fillDish = function(dishToFill) {

    var dish = {};

    dish.name = this.eat.getParam(
        'name',
        this.attrs.name.validation,
        this.attrs.name.pattern
    );
    if (dish.name === false) {
        return false;
    }
    dish.description = this.eat.getParam(
        'description',
        this.attrs.description.validation,
        this.attrs.description.pattern
    );
    if (dish.description === false) {
        return false;
    }
    dish.when = this.eat.getParam(
        'when',
        this.attrs.when.validation
    );
    if (dish.when === false) {
        return false;
    }
    dish.nportions = this.eat.getParam(
        'nportions',
        this.attrs.nportions.validation
    );
    if (dish.nportions === false) {
        return false;
    }
    dish.donation = this.eat.getParam(
        'donation',
        this.attrs.donation.validation
    );
    if (dish.donation === false) {
        return false;
    }

    // If there are no issues we fill the object and return it.
    for (var attr in dish) {
        if (dish.hasOwnProperty(attr)) {
            dishToFill[attr] = dish[attr];
        }
    }
    return dishToFill;
};

/**
 * @private
 */
EatDish.prototype.returnDish = function(dish, returnCode) {
    // Keeping a separate function for the transition.
    return this.eat.returnCallback(null, dish, returnCode);
};

module.exports = EatDish;
