var plan = require('flightplan');

var config = {
  keepReleases: 5
};
var shared = {
  '.env': true,
  'uploads': 'web/app/uploads'
};

plan.target('dev', {
  host: 'whitespace.work',
  username: 'whitespace',
  agent: process.env.SSH_AUTH_SOCK
}, {
  root:'/srv/www',
  targets: [ 'julkalender.whitespace.work' ],
  user: 'web'
});


/*
 * init
 *
 * Initialize the server by setting up a suitable project structure.
 */
plan.remote('init', function(remote) {
  var root = plan.runtime.options.root;
  var targets = plan.runtime.options.targets;
  var user = plan.runtime.options.user;

  targets.forEach(function(target) {
    var dir = root + '/' + target;

    remote.sudo('mkdir -p ' + dir + '/releases', { user: user });
    remote.sudo('mkdir -p ' + dir + '/shared', { user: user });
  });
});

/*
 * deploy
 *
 * Deploy a release to the server. Will deploy to a specific sub folder
 * and symlink it as the current release.
 */
var time = new Date().toISOString();
var tmpDir = '/tmp/app' + time;
plan.local('deploy', function(local) {

  local.log('Building the site');
  local.exec('composer dump-autoload --optimize');
  local.log('Copying release');

  var ignoredFilesAndFolders = [
    'grep -v node_modules',
    'grep -v "web/app/uploads"',
    'grep -v spacecraft',
    //'grep -v "templates"'
  ];
  var grep = ignoredFilesAndFolders.toString().replace(/,/g, ' | ');

  var files = local.find('config vendor web -type f | ' + grep, { silent: true });
  var components = local.find('web/app/themes/*/templates/components -name "*.twig"', { silent: true });
  //var components2 = local.find('web/app/themes/*/templates/components/*', { silent: true });

  files.stdout += components.stdout;
  // files.stdout += components2.stdout;

  local.transfer(files, tmpDir);
});

plan.remote('deploy', function(remote) {
  var root = plan.runtime.options.root;
  var targets = plan.runtime.options.targets;
  var user = plan.runtime.options.user;

  targets.forEach(function(target) {
    var dir = root + '/' + target;
    var release = dir + '/releases/' + time;

    remote.log('Deploying subsite ' + target + ' to ' + release);

    remote.sudo('cp -R ' + tmpDir + ' ' + release, { user: user }, { user: user });

    Object.keys(shared).forEach(function(key) {
      var s = dir + '/shared/' + key;
      var name = shared[key];
      if(name === true) {
        name = key;
      }
      var t = release + '/' + name;
      remote.sudo('ln -s ' + s + ' ' + t, { user: user });
    });

    remote.sudo('rm ' + dir + '/current', { failsafe: true, user: user });
    remote.sudo('ln -s ' + dir + '/releases/' + time + ' ' + dir + '/current', { user: user });

    remote.log('Checking for stale releases');
    var releases = getReleases(remote,dir);
    if (releases.length > config.keepReleases) {
      var removeCount = releases.length - config.keepReleases;
      remote.log('Removing ' + removeCount + ' stale release(s)');
      releases = releases.slice(0, removeCount);
      releases = releases.map(function (item) {
        return dir + '/releases/' + item;
      });
      remote.sudo('rm -rf ' + releases.join(' '));
    }
  });

  remote.rm('-R ' + tmpDir);
  sendToSlack(plan.runtime.target);
});

plan.remote('rollback', function(remote) {
  //usage fly rollback:staging
  var root = plan.runtime.options.root;
  var targets = plan.runtime.options.targets;
  var user = plan.runtime.options.user;

  targets.forEach(function(target) {
    var dir = root + '/' + target;
    remote.log('Rolling back release');
    var releases = getReleases(remote,dir);
    if (releases.length > 1) {
      var oldCurrent = releases.pop();
      var newCurrent = releases.pop();
      remote.log('Linking current to ' + newCurrent);
      remote.sudo('ln -nfs ' + dir + '/releases/' + newCurrent + ' '+ dir + '/current');
      remote.log('Removing ' + oldCurrent);
      remote.sudo('rm -rf ' + dir + '/releases/' + oldCurrent);
    }

  });

});

function getReleases(remote,dir) {
  var releases = remote.exec('ls ' + dir +
    '/releases', {silent: true});

  if (releases.code === 0) {
    releases = releases.stdout.trim().split('\n');
    return releases;
  }

  return [];
}
function sendToSlack(target){
  var pjson = require('./package.json');
  var args = process.argv.slice(2);
  if (args.indexOf("-slack") > -1) {
    var Slack = require('slack-node');
    slack = new Slack();
    slack.setWebhook(config.slackWebhookUri);

    slack.webhook({
      channel: "#deploy_nitification",
      username: pjson.name,
      icon_emoji:':airplane:',
      text: "A new release has just been pushed to "+ target
    }, function(err, response) {
      console.log('Slack:' + response.status);
    });
  }
}
