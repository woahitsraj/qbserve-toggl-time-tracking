require('dotenv').config()
const watch = require('node-watch')
const axios = require('axios')
const moment = require('moment')
const fs = require('fs');
let TogglClient = require('toggl-api')

let toggl = new TogglClient({apiToken: process.env.TOGGLE_API_TOKEN});

watch('./qbserve-json/', { recursive: true }, function(evt, fileName) {
  console.log('%s changed.', fileName);
  if (evt == 'update') {
    let data = require(`./${fileName}`)
    toggl.getWorkspaces((err, workspaces) => {
      let workspace = workspaces[0]
      for (var i = 0; i < data.history.log.length; i++) {
        let logItem = data.history.log[i]
        setTimeout(function () {
          let activity = data.history.activities[logItem.activity_id]
          let app = data.history.apps[activity.app_id]
          let category = data.history.categories[app.category_id]
          let startTime = moment(logItem.start_time * 1000).toISOString()
          let tags = []
          tags.push(category.name)
          if (category.productivity === -1) {
            tags.push('distracting')
          } else if (category.productivity === 0) {
            tags.push('neutral')
          } else if (category.productivity === 1) {
            tags.push('productive')
          }
          toggl.createTimeEntry({
            description: `${app.name} ${activity.source}:${activity.title}`,
            wid: workspaces[0].id,
            start: startTime,
            duration: logItem.duration,
            created_with: 'Qbserve-Toggl',
            tags
          }, (err, createdTime) => {
            if (!err) {
              console.log(`Sucessfully created time: ${createdTime.data}`)
            } else {
              console.log(err)
            }
          })
        }, 2000 * i)
      }
      fs.unlink(`./${fileName}`, (err) => {
        if (err) throw err;
        console.log(`successfully deleted ${fileName}`);
      });
    })
  }
})
