/**
 * Created by Daniel Tebernum
 * Date: 16.05.16
 * This module transforms Go-Lab Action Logs to the xAPI standard
 */

var xapiValidator = require("./xapiValidator");
var moment = require('moment-timezone');

var Class = require("./class");

module.exports = Class(/** @lends LoggingService */{
    'constructor': function () {
    },

    'private': {

        iri: 'http://golabz.eu',

        verb_mapping: {
            add: {
                verbID: 'http://activitystrea.ms/schema/1.0/add',
                verbDisplay: 'added',
                verbLanguage: 'en-US'
            },
            change: {
                verbID: 'http://curatr3.com/define/verb/edited',
                verbDisplay: 'Edited',
                verbLanguage: 'en-US'
            },
            remove: {
                verbID: 'http://activitystrea.ms/schema/1.0/remove',
                verbDisplay: 'removed',
                verbLanguage: 'en-US'
            },
            access: {
                verbID: 'http://activitystrea.ms/schema/1.0/access',
                verbDisplay: 'accessed',
                verbLanguage: 'en-US'
            },
            start: {
                verbID: 'http://activitystrea.ms/schema/1.0/start',
                verbDisplay: 'started',
                verbLanguage: 'en-US'
            },
            cancel: {
                verbID: 'http://activitystrea.ms/schema/1.0/cancel',
                verbDisplay: 'canceled',
                verbLanguage: 'en-US'
            },
            send: {
                verbID: 'http://activitystrea.ms/schema/1.0/send',
                verbDisplay: 'sent',
                verbLanguage: 'en-US'
            },
            receive: {
                verbID: 'http://activitystrea.ms/schema/1.0/receive',
                verbDisplay: 'received',
                verbLanguage: 'en-US'
            },
            open: {
                verbID: 'http://activitystrea.ms/schema/1.0/open',
                verbDisplay: 'opened',
                verbLanguage: 'en-US'
            },
            create: {
                verbID: 'http://activitystrea.ms/schema/1.0/create',
                verbDisplay: 'created',
                verbLanguage: 'en-US'
            },
            update: {
                verbID: 'http://activitystrea.ms/schema/1.0/update',
                verbDisplay: 'updated',
                verbLanguage: 'en-US'
            },
            delete: {
                verbID: 'http://activitystrea.ms/schema/1.0/delete',
                verbDisplay: 'deleted',
                verbLanguage: 'en-US'
            }
        },

        template: {
            actorType: 'Agent',
            actorAgentEmail : '',
            actorAgentEmailSha1: '',
            actorAgentOpenID: '',
            actorAgentAccount: {
                homePage: 'http://golabz.eu',
                name: ''
            },
            actorAgentName: '',
            actorGroupEmail: '',
            actorGroupEmailSha1: '',
            actorGroupOpenID: '',
            actorGroupAccount: '',
            actorGroupName: '',
            actorGroupMembers: '',
            verbID: '',
            verbDisplay: '',
            verbLanguage: '',
            objectType: 'Activity',
            objectActivityID: '',
            objectActivityName: '',
            objectActivityDescription: '',
            objectActivityLanguage: 'en-US',
            objectActivityType: '',
            objectActivityMoreInfo: '',
            objectActivityInteractionType: '',
            objectActivityComponentListChoices: '',
            objectActivityComponentListScale: '',
            objectActivityComponentListSource: '',
            objectActivityComponentListTarget: '',
            objectActivityComponentListSteps: '',
            objectActivityCorrectResponsesPattern: '',
            objectActivityExtensions: {},
            objectAgentEmail: '',
            objectAgentEmailSha1: '',
            objectAgentOpenID: '',
            objectAgentAccount: '',
            objectAgentName: '',
            objectGroupEmail: '',
            objectGroupEmailSha1: '',
            objectGroupOpenID: '',
            objectGroupAccount: '',
            objectGroupName: '',
            objectGroupMembers: '',
            objectStatementRef: '',
            objectSubStatement: '',
            resultScaledScore: '',
            resultRawScore: '',
            resultMinScore: '',
            resultMaxScore: '',
            resultSuccess: '',
            resultCompletion: '',
            resultResponse: '',
            resultDuration: '',
            resultExtensions: '',
            contextRegistrationID: '',
            contextInstructorEmail: '',
            contextInstructorName: '',
            contextTeamName: '',
            contextTeamMembers: '',
            contextContextActivities: '',
            contextRevision: '',
            contextPlatform: 'Go-Lab',
            contextLanguage: '',
            contextStatement: '',
            contextExtensions: {},
            attachmentUsageType: '',
            attachmentDisplay: '',
            attachmentDescription: '',
            attachmentLanguage: '',
            attachmentContentType: '',
            attachmentLength: '',
            attachmentSha2: '',
            attachmentFileURL: '',
            statementTimestamp: '',
            statementID: '',
            statementVersion: '1.0.0'
        },

        mapActionLogToXAPI: function (log) {
            this.fillTemplate(log);
            var statement = this.buildStatement(this.template);
            var report = xapiValidator.validateStatement(JSON.stringify(statement));

            if (this.xapiEvaluateReport(report)) {
                return statement;
            }

            return false;
        },

        fillTemplate: function (log) {

            /*Actor*/
            this.template.actorAgentName = log.actor.displayName;
            this.template.actorAgentAccount.name = log.actor.id;

            /*Verb*/
            this.template.verbID = this.verb_mapping[log.verb].verbID;
            this.template.verbDisplay = this.verb_mapping[log.verb].verbDisplay;
            this.template.verbLanguage = this.verb_mapping[log.verb].verbLanguage;

            /*Object*/
            this.template.objectActivityID = log.generator.url + '#objectID=' + log.object.id;
            this.template.objectActivityType = log.generator.url + '#objectType=' + log.object.objectType;
            this.template.objectActivityDescription = log.object.content;
            this.template.objectActivityName = typeof log.object.title !== 'undefined' ? log.object.title : log.object.content;
            this.template.objectActivityExtensions[this.iri + '#alObject'] = log.object;

            /*Context*/
            this.template.contextExtensions[this.iri + '#alTarget'] = log.target;
            this.template.contextExtensions[this.iri + '#alGenerator'] = log.generator;
            this.template.contextExtensions[this.iri + '#alProvider'] = log.provider;

            /*Timestamp*/
            this.template.statementTimestamp = log.published;
            // console.log(this.template);
        },

        /**
         * This function checks for 'MUST_VIOLATION'
         * FALSE is returned if a 'MUST_VALIDATION' is found
         * TRUE is returned else
         * @param report
         * @returns {boolean}
         */
        xapiEvaluateReport: function (report) {

            for (var i=0; i < report.errors.length; ++i) {
                if(report.errors[i].level === 'MUST_VIOLATION') {
                    console.log('[xAPI Logging Service] Validation error:');
                    console.log(report.errors[i]);
                    return false;
                }
            }

            return true;
        },

        /**
         * ADL xAPI Lab:
         * This function builds a xAPI Statement from a JSON Object.
         * @param data
         * @returns {{}}
         */
        buildStatement: function (data) {

            var stmt = {};

            if (data.statementTimestamp != "") { stmt['timestamp'] = moment(new Date(data.statementTimestamp)).format(); }
            if (data.statementID != "") { stmt['id'] = data.statementID; }
            if (data.statementVersion != "") { stmt['version'] = data.statementVersion; }

            stmt['actor'] = {};
            switch(data.actorType) {
                case "Agent":
                    // LRS will reject if more than one IFI is in the statement
                    if (data.actorAgentEmail != "") { stmt['actor']['mbox'] = "mailto:" + data.actorAgentEmail; }
                    if (data.actorAgentEmailSha1 != "") { stmt['actor']['mbox_sha1sum'] = data.actorAgentEmailSha1; }
                    if (data.actorAgentOpenID != "") { stmt['actor']['openid'] = data.actorAgentOpenID; }
                    if (data.actorAgentAccount != "") { stmt['actor']['account'] = data.actorAgentAccount; }
                    if (data.actorAgentName != "") { stmt['actor']['name'] = data.actorAgentName; }
                    stmt['actor']['objectType'] = "Agent";
                    break;
                case "Group":
                    if (data.actorGroupEmail != "") { stmt['actor']['mbox'] = "mailto:" + data.actorGroupEmail; }
                    if (data.actorGroupEmailSha1 != "") { stmt['actor']['mbox_sha1sum'] = data.actorGroupEmailSha1; }
                    if (data.actorGroupOpenID != "") { stmt['actor']['openid'] = data.actorGroupOpenID; }
                    if (data.actorGroupAccount != "") { stmt['actor']['account'] = data.actorGroupAccount; }
                    if (data.actorGroupName != "") { stmt['actor']['name'] = data.actorGroupName; }
                    if (data.actorGroupMembers != "") { stmt['actor']['member'] = data.actorGroupMembers; }
                    break;
                default:
            }

            stmt['actor']['objectType'] = data.actorType;

            stmt['verb'] = {};
            stmt['verb']['id'] = data.verbID;
            stmt['verb']['display'] = {};
            stmt['verb']['display'][data.verbLanguage] = data.verbDisplay;
            stmt['object'] = {};

            switch(data.objectType) {
                case "Activity":
                    stmt['object']['id'] = data.objectActivityID;
                    if (/.+/.test([ data.objectActivityName, data.objectActivityDescription, data.objectActivityType, data.objectActivityMoreInfo, data.objectActivityExtensions ].join(""))) {
                        stmt['object']['definition'] = {};
                    }
                    if (data.objectActivityName != "" && data.objectActivityLanguage != "") {
                        stmt['object']['definition']['name'] = {};
                        stmt['object']['definition']['name'][data.objectActivityLanguage] = JSON.stringify(data.objectActivityName);
                    }
                    if (data.objectActivityDescription != "" && data.objectActivityLanguage != "") {
                        stmt['object']['definition']['description'] = {};
                        stmt['object']['definition']['description'][data.objectActivityLanguage] = JSON.stringify(data.objectActivityDescription);
                    }
                    if (data.objectActivityType != "") { stmt['object']['definition']['type'] = data.objectActivityType; }
                    if (data.objectActivityMoreInfo != "") { stmt['object']['definition']['moreInfo'] = data.objectActivityMoreInfo; }
                    if (data.objectActivityInteractionType != "") { stmt['object']['definition']['interactionType'] = data.objectActivityInteractionType; }
                    if (data.objectActivityComponentListChoices != "") { stmt['object']['definition']['choices'] = data.objectActivityComponentListChoices; }
                    if (data.objectActivityComponentListScale != "") { stmt['object']['definition']['scale'] = objectActivityComponentListScale; }
                    if (data.objectActivityComponentListSource != "") { stmt['object']['definition']['source'] = data.objectActivityComponentListSource; }
                    if (data.objectActivityComponentListTarget != "") { stmt['object']['definition']['target'] = data.objectActivityComponentListTarget; }
                    if (data.objectActivityComponentListSteps != "") { stmt['object']['definition']['steps'] = objectActivityComponentListSteps; }
                    if (data.objectActivityCorrectResponsesPattern != "") { stmt['object']['definition']['correctResponsesPattern'] = data.objectActivityCorrectResponsesPattern; }
                    if (data.objectActivityExtensions != "") { stmt['object']['definition']['extensions'] = data.objectActivityExtensions; }
                    break;
                case "Agent":
                    // LRS will reject if more than one IFI is in the statement
                    if (data.objectAgentEmail != "") { stmt['object']['mbox'] = "mailto:" + data.objectAgentEmail; }
                    if (data.objectAgentEmailSha1 != "") { stmt['object']['mbox_sha1sum'] = data.objectAgentEmailSha1; }
                    if (data.objectAgentOpenID != "") { stmt['object']['openid'] = data.objectAgentOpenID; }
                    if (data.objectAgentAccount != "") { stmt['object']['account'] = data.objectAgentAccount; }
                    if (data.objectAgentName != "") { stmt['object']['name'] = data.objectAgentName; }
                    stmt['object']['objectType'] = "Agent";
                    break;
                case "Group":
                    if (data.objectGroupEmail != "") { stmt['object']['mbox'] = "mailto:" + data.objectGroupEmail; }
                    if (data.objectGroupEmailSha1 != "") { stmt['object']['mbox_sha1sum'] = data.objectGroupEmailSha1; }
                    if (data.objectGroupOpenID != "") { stmt['object']['openid'] = data.objectGroupOpenID; }
                    if (data.objectGroupAccount != "") { stmt['object']['account'] = data.objectGroupAccount; }
                    if (data.objectGroupName != "") { stmt['object']['name'] = data.objectGroupName; }
                    if (data.objectGroupMembers != "") { stmt['object']['member'] = data.objectGroupMembers; }
                    break;
                case "StatementRef":
                    stmt['object']['id'] = data.objectStatementRef;
                    break;
                case "SubStatement":
                    stmt['object'] = data.objectSubStatement;
                    break;
                default:
            }

            stmt['object']['objectType'] = data.objectType;

            if (/.+/.test([ data.resultScaledScore, data.resultRawScore, data.resultMinScore, data.resultMaxScore, data.resultSuccess, data.resultCompletion, data.resultResponse, data.resultDuration, data.resultExtensions ].join(""))) {
                stmt['result'] = {};
                if ( data.resultScaledScore != "" || data.resultRawScore != "" || data.resultMinScore != "" || data.resultMaxScore != "" ) {
                    stmt['result']['score'] = {};
                    if (data.resultScaledScore != "") { stmt['result']['score']['scaled'] = parseFloat(data.resultScaledScore); }
                    if (data.resultRawScore != "") { stmt['result']['score']['raw'] = parseInt(data.resultRawScore); }
                    if (data.resultMinScore != "") { stmt['result']['score']['min'] = parseInt(data.resultMinScore); }
                    if (data.resultMaxScore != "") { stmt['result']['score']['max'] = parseInt(data.resultMaxScore); }
                }
                if (data.resultSuccess != "") { stmt['result']['success'] = (data.resultSuccess === 'true'); }
                if (data.resultCompletion != "") { stmt['result']['completion'] = (data.resultCompletion === 'true'); }
                if (data.resultResponse != "") { stmt['result']['response'] = data.resultResponse; }
                if (data.resultDuration != "") { stmt['result']['duration'] = data.resultDuration; }
                if (data.resultExtensions != "") { stmt['result']['extensions'] = data.resultExtensions; }
            }

            if (/.+/.test([ data.contextRegistrationID, data.contextInstructorEmail, data.contextInstructorName, data.contextTeamName, data.contextTeamMembers, data.contextContextActivities, data.contextRevision, data.contextPlatform, data.contextLanguage, data.contextStatement, data.contextExtensions ].join(""))) {
                stmt['context'] = {};
                if (data.contextRegistrationID != "") { stmt['context']['registration'] = data.contextRegistrationID; }
                if (data.contextInstructorEmail != "" || data.contextInstructorName != "") {
                    stmt['context']['instructor'] = {};
                    if (data.contextInstructorEmail != "") { stmt['context']['instructor']['mbox'] = "mailto:" + data.contextInstructorEmail; }
                    if (data.contextInstructorName != "") { stmt['context']['instructor']['name'] = data.contextInstructorName; }
                }
                if (data.contextTeamName != "" || data.contextTeamMembers != "") { // This is going to need to support more formats
                    stmt['context']['team'] = {};
                    if (data.contextTeamName != "") { stmt['context']['team']['name'] = data.contextTeamName; }
                    if (data.contextTeamMembers != "") { stmt['context']['team']['member'] = data.contextTeamMembers; }
                    stmt['context']['team']['objectType'] = "Group";
                }
                if (data.contextContextActivities != "") { // The user must know where they are doing here
                    stmt['context']['contextActivities'] = data.contextContextActivities;
                }
                if (data.contextRevision != "") { stmt['context']['revision'] = data.contextRevision; }
                if (data.contextPlatform != "") { stmt['context']['platform'] = data.contextPlatform; }
                if (data.contextLanguage != "") { stmt['context']['language'] = data.contextLanguage; }
                if (data.contextStatement != "") {
                    stmt['context']['statement']['id'] = data.contextStatement;
                    stmt['context']['statement']['objectType'] = "Group";
                }
                if (data.contextExtensions != "") { stmt['context']['extensions'] = data.contextExtensions; }
            }

            if (/.+/.test([ data.attachmentDisplay, data.attachmentDescription, data.attachmentLanguage, data.attachmentContentType, data.attachmentLength, data.attachmentSha2, data.attachmentFileURL ].join(""))) {
                stmt['attachments'] = [];
                var attachment = {};
                attachment['usageType'] = data.attachmentUsageType;
                if (data.attachmentDisplay != "" && data.attachmentLanguage != "") {
                    attachment['display'] = {};
                    attachment['display'][data.attachmentLanguage] = data.attachmentDisplay;
                }
                if (data.attachmentDescription != "" && data.attachmentLanguage != "") {
                    attachment['description'] = {};
                    attachment['description'][data.attachmentLanguage] = data.attachmentDescription;
                }
                attachment['contentType'] = data.attachmentContentType;
                attachment['length'] = parseInt(data.attachmentLength);
                attachment['sha2'] = data.attachmentSha2;
                if (data.attachmentFileURL != "") { attachment['fileUrl'] = data.attachmentFileURL; }
                stmt['attachments'].push(attachment);
            }

            // console.log(stmt);
            return stmt;
        }
    },
    'public': {
        transformALToXAPI: function (log) {
            return this.mapActionLogToXAPI(log);
        }
    }
});