function isValidUrl(url) {
  const urlRegexp = new RegExp(
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/, 'g');

  return urlRegexp.test(url);
}

function isValidEmail(email) {
  let emailRegexp = new RegExp(''
    + /^(([^<>()[]\.,;:\s@"]+(\.[^<>()[]\.,;:\s@"]+)*)|(".+"))/.source
    + /@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.source);
  return emailRegexp.test(email);
}
function getScore(target, value) {
  return target.score ? target.score + value : value;
}

function getFieldWeight(field) {
  const fields = {
    "name": 1,
    "description": 1,
    "permissions.licenses": 1,
    "permissions.licenses.URL": 1,
    "permissions.licenses.name": 1,
    "permissions.usageType": 1,
    "permissions.exemptionText": 1,
    "organization": 1,
    "contact.email": 1,
    "contact.name": 1,
    "contact.URL": 1,
    "contact.phone": 1,
    "tags": 1,
    "laborHours": 1,
    "languages": 0.8,
    "repositoryURL": 0.8,
    "homepageURL": 0.8,
    "downloadURL": 0.8,
    "vcs": 0.8,
    "date.created": 0.6,
    "date.lastModified": 0.6,
    "date.metadataLastUpdated": 0.6,
    "version": 0.6,
    "status": 0.6,
    "disclaimerURL": 0.4,
    "disclaimerText": 0.4,
    "relatedCode.name": 0.4,
    "relatedCode.URL": 0.4,
    "reusedCode.name": 0.4,
    "reusedCode.URL": 0.4,
    "partners.name": 0.4,
    "partners.email": 0.4,
    "target_operating_systems": 0.2,
    "additional_information": 0.1
  };

  return fields[field] ? fields[field] : 0;
}

module.exports = function () {
  return [
    {
      validation: function (target) {
        return target['name'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('name'));
        return target;
      }
    },
    {
      validation: function (target) {
        let isValid = false;
        if (target['description']) {
          isValid = target['description'] === target['name'] ? false : true;
        }

        isValid = target['description'].split(' ').length > 3;

        return isValid;
      },
      outcome: function (target) {
        const description = target['description'].split(' ');

        if (description.length > 30) {
          target.score = getScore(target, getFieldWeight('description'));
        } else if (description.length < 30 && description.length > 10) {
          target.score = getScore(target, 0.5);
        } else {
          target.score = getScore(target, 0.1);
        }

        return target;
      }
    },
    {
      validation: function (target) {
        if (target['permissions.licenses.URL']) {
          return isValidUrl(target['permissions.licenses.URL']);
        }
        return false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('permissions.licenses.URL'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['permissions.licenses.name'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('permissions.licenses.name'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['permissions.usageType'] ? true : false;
      },
      outcome: function (target) {
        const usageType = target['permissions.usageType'];

        if (usageType.toLowerCase() === 'opensource') {
          target.score = getScore(target, getFieldWeight('permissions.usageType'));
        } else if (usageType.toLowerCase() === 'governmentwidereuse') {
          target.score = getScore(target, 0.5);
        } else {
          target.score = getScore(target, 0.1);
        }

        return target;
      }
    },
    {
      validation: function (target) {
        if(target['permissions.usageType'] && target['permissions.usageType'].match(/^excempt.*/g)){
          return target['permissions.exemptionText'] ? true : false;
        }
        return false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('permissions.exemptionText'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['organization'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('organization'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['contact.email'] && isValidEmail(target['contact.email']);
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('contact.email'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['contact.name'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('contact.name'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['contact.URL'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('contact.URL'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['contact.phone'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('contact.phone'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['tags'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(
          target.score,
          getFieldWeight('tags') * target['tags'].length);

        return target;
      }
    },
    {
      validation: function (target) {
        return target['laborHours'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('laborHours'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['languages'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(
          target.score,
          getFieldWeight('languages') * target['languages']);

        return target;
      }
    },
    {
      validation: function (target) {
        // not only should there be a value but also a proper URL
        return target['repositoryURL'] && isValidUrl(target['repositoryURL']);
      },
      outcome: function (target) {
        let tmpScore = 0;
        if (target['permissions.usageType'] === 'openSource') {
          // we want to give more weight to open source repos
          tmpScore = 1;
        } else {
          tmpScore = getFieldWeight('languages');
        }

        target.score = getScore(target,tmpScore);
        return target;
      }
    },
    {
      validation: function (target) {
        return target['homepageURL'] && isValidUrl(target['homepageURL']);
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('homepageURL'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['downloadURL'] && isValidUrl(target['downloadURL']);
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('downloadURL'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['vcs'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('vcs'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['date.created'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('date.created'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['date.lastModified'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('date.lastModified'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['date.metadataLastUpdated'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('date.metadataLastUpdated'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['version'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('version'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['status'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('status'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['disclaimerURL'] && isValidUrl(target['disclaimerURL']);
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('disclaimerURL'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['disclaimerText'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('disclaimerText'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['relatedCode.name'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('relatedCode.name'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['relatedCode.URL'] && isValidUrl(target['relatedCode.URL']);
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('relatedCode.URL'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['reusedCode.name'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('reusedCode.name'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['reusedCode.URL'] && isValidUrl(target['reusedCode.URL']);
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('reusedCode.URL'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['partners.name'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('partners.name'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['partners.email'] && isValidEmail(target['partners.email']);
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('partners.email'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['target_operating_systems'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('target_operating_systems'));
        return target;
      }
    },
    {
      validation: function (target) {
        return target['additional_information'] ? true : false;
      },
      outcome: function (target) {
        target.score = getScore(target, getFieldWeight('additional_information'));
        return target;
      }
    }
  ];
};
