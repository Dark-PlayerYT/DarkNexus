import {
  helpBackButton,
  helpBugReportButton,
  helpPaginationButton,
} from '../../../handlers/help/helpButtons.js';

const paginationIds = [
  'Yardım-Sayfası-İlk',
  'Yardım-Sayfası-Geri',
  'Yardım-Sayfası-İleri',
  'Yardım-Sayfası-Son',
];

const paginationInteractions = paginationIds.map((name) => ({
  name,
  execute: helpPaginationButton.execute,
}));

export default [helpBackButton, helpBugReportButton, ...paginationInteractions];
