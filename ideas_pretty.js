Ideas = new Mongo.Collection("ideas");
var adminId = "RNbayr89KquiYmAva";

if (Meteor.isServer) {
  Meteor.publish("ideas", function () {
    return Ideas.find({});
  });

  Meteor.methods({
    chargeCard: function (stripeToken) {
      check(stripeToken, String);
      var Stripe = StripeAPI('sk_test_WJd7m93yMLufYGDHf8W8yxKQ');

      Stripe.charges.create({
        source: stripeToken,
        amount: 1,
        currency: 'usd'
      }, function(err, charge) {
        console.log(err, charge);
      });
    }
  });
}

if (Meteor.isClient) {
  Meteor.subscribe("ideas");

  Template.body.helpers({
    ideas: function () {
      return Ideas.find({
        $or: [
          { owner: Meteor.userId() },
          { writer: Meteor.userId() }
        ]
      },{sort: {createdAt: -1}})
    },
    isAdmin: function () {
      return Meteor.userId() === adminId;
    }
  });

  Template.body.events({
    "click .buy": function (event) {
      event.preventDefault();
      if (Ideas.findOne({$or: [{owner: "RNbayr89KquiYmAva"}]})) {
        Meteor.call("buyIdea");
      }
      else {
        window.alert("No new ideas (or drawings) right now!");
        throw new Meteor.Error("No new ideas (or drawings) right now!");
      }

    },

    "submit .new-idea": function (event) {
      // Prevent default browser form submit
      event.preventDefault();

      // Get value from form element
      var text = event.target.text.value;

      // Insert a task into the collection
      Meteor.call("addIdea", text);

      // Clear form
      event.target.text.value = "";
    }
  });

// TODO: Find my user id and replace

  Template.idea.helpers({
    isAdmin: function () {
      return Meteor.userId() === adminId;
    },

    prettifyDate: function(createdAt) {
      return new Date(createdAt).toString('yyyy-MM-dd');
    }
  });

  Template.idea.events({
    "click .delete": function (event) {
      Meteor.call("deleteIdea", this._id);
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

}

//TODO: confirm purchase and return random unassigned ideaId
Meteor.methods({
  buyIdea: function () {

    if (! Meteor.userId()) {
          throw new Meteor.Error("not-authorized");
    }

    StripeCheckout.open({
      key: 'pk_test_Sb6MdLVQdnOecYA1WXVIhJFL',
          amount: 1, // this is equivalent to $50
          name: 'Sometimes my ideas are drawings',
          description: 'Buy an idea* ($1)',
          panelLabel: 'Pay Now',
          token: function(res) {
            stripeToken = res.id;
            console.info(res);
            Meteor.call("chargeCard", stripeToken);
            Meteor.call("updateIdea");
          }
    });

  },

  deleteIdea: function (ideaId) {
    var idea = Ideas.findOne(ideaId);
    if (idea.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    if(Meteor.userId() === adminId){
      Ideas.remove(ideaId);
    }
    else {
      Ideas.update(idea, { $set: {owner: adminId, username: "Jake Lazarus"} });
    }
  },

  addIdea: function (text) {
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Ideas.insert({
      text: text,
      createdAt: new Date(),
      writer: Meteor.userId(),
      owner: Meteor.userId(),
      username: Meteor.user().username || Meteor.user().profile.name
    });
  },

  updateIdea: function () {
    var idea = Ideas.findOne({ owner: { $eq: adminId }});
    Ideas.update(idea, { $set: {owner: Meteor.userId(), username: Meteor.user().username} });
  }
});
