/*
 * GET home page.
 */

exports.index = function(req, res){
    console.log("index-sessions: %j" ,sessions);
  res.render('index', { 
      title: 'OpenTok Test',
      sessions:  sessions
  });
};

exports.support = function(req, res, sessions){
  res.render('support', { 
      title: 'Support'
  });
};