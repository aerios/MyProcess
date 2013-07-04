var underscore = require('underscore')._;
var MyEvents = require('myevents');
var spawn = require('child_process').spawn;
var fork = require('child_process').fork;
var util = require('util');
var MyProcess;

MyProcess = {	
	toString:function(){
		return [this.options.proc,this.options.args].join(" ");
	},
	init:function(proc,args,type,stdOpt){
		type = type || 'spawn';
		this.options.proc = proc;
		this.options.args = args;
		this.options.type = type;
		this.options.stdOpt = stdOpt;
		this.promise = MyEvents.getPromise();
		return this;
	},
	run:function(enable_self_destruct){
		if(!this.options.proc)throw new Error('No process specified');
		if(this.child)return this.promise;		
		var type = this.options.type;
		var child;
		var stdOpt = this.options.stdOpt || {stdio:'inherit'};
		var selfDestructTO = null;
		if(type == 'spawn'){
			child = spawn(this.options.proc,this.options.args,stdOpt);
		}else if(type == 'fork'){
			var path = this.options.args[0];
			this.options.args.shift();
			stdOpt.stdio = 'ignore';
			child = fork(path,this.options.args,stdOpt);
		}
		
		//console.log('Running process : '+this.options.proc+" : "+this.options.args);
		//console.log("PID : "+child.pid);
		var promise = this.promise;
		var self = this;
		child.on('exit',function(code,signal){
			if(selfDestructTO)
				selfDestructTO.destroy();
			//console.log('Process PID',child.pid," with command",self.options.proc,self.options.args.join(" "),"exited with status code",code);
			promise.fulfill(code,signal);
		})
		this.child = child;
		if(enable_self_destruct){
			selfDestructTO = MyEvents.getDelay(3600*1000*2).done(function(){
				child.exit();
			})
		}
		return promise;
	},
	getPID:function(){
		if(!this.child)return null;
		return this.child.pid;
	},
	done:function(fn,ctx){
		if(!this.options.proc)throw new Error('No process specified');
		return this.promise.done(fn,ctx);
	},
	getProcess:function(){
		return this.child;
	},
	isForked:function(){
		return this.options.type == 'fork';
	},
	isSpawned:function(){
		return this.options.type == 'spawn';
	},
	exit:function(){
		if(!this.child)return;
		this.child.kill();
	}
};

var constr = function(){
	this.options = {
		proc:null,
		args:[],
		type:'spawn'
	};
	this.child = null
	this.promise = null;	
};
constr.prototype = MyProcess;
constr.SPAWN = "spawn";
constr.FORK = "fork";
module.exports = constr;