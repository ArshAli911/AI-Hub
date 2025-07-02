import moment from 'moment';

export const formatTimestampToDate = (timestamp: number): string => {
  return moment(timestamp).format('MMMM Do YYYY');
};

export const formatTimestampToTime = (timestamp: number): string => {
  return moment(timestamp).format('h:mm A');
};

export const formatTimestampToDateTime = (timestamp: number): string => {
  return moment(timestamp).format('MMMM Do YYYY, h:mm A');
};

// Add more date formatting functions as needed 