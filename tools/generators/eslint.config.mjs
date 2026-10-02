/**
 * @file ESLint configuration for the workspace generators (templates under files/ are not linted).
 */
import baseConfig from '../../eslint.config.mjs';

export default [...baseConfig, { ignores: ['src/generators/**/files/**'] }];
