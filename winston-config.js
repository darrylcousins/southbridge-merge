'use-strict';

const path = require('path');
const winston = require('winston');

const partsNZTime = (timestamp) => {
  // insist on NZ locale
  const d = new Date(timestamp).toLocaleString("en-NZ", {
    timeZone: "Pacific/Auckland",
    hour12: false
  });
  return d.split(',').map(el => el.trim());
};

const fileFormat = winston.format.printf(
  info => {
    const parts = partsNZTime(info.timestamp);
    `${new Date(parts[0]).toDateString()} ${parts[1]} - ${info.level}: ${info.message}`;
  }
);

const consoleFormat = winston.format.printf(
  info => {
    // return time only
    const parts = partsNZTime(info.timestamp);
    return `${parts[1]} - ${info.level}: ${info.message}`;
  }
);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.timestamp(),
  transports: []
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        consoleFormat,
      )
    })
  );
} else {
  logger.add(
    new winston.transports.File({
      filename: path.resolve('logs/app.log'),
      format: fileFormat,
    })
  );
};

// create a stream object with a 'write' function that will be used by `morgan`
logger.stream = {
  write: function(message, encoding) {
    // use the 'info' log level so the output will be picked up by both transports (file and console)
    logger.info(message);
  },
};

module.exports = logger;
