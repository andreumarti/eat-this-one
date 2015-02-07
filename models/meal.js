var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var MealSchema = new Schema({
    dishid: { type: String, required: true, index: 1},
    userid: { type: String, required: true, index: 1},
    created: { type: Date, default: Date.now}
});
MealSchema.index({dishid : 1, userid : 1}, {unique: true});

// Export the model and the entity structure.
module.exports.schema = MealSchema;
module.exports.model = mongoose.model('Meal', MealSchema);
