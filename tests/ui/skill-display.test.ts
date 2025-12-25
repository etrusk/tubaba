/**
 * Tests for SkillDisplay Component
 * 
 * Critical path: Verify HTML structure and tooltip content
 */

import { describe, it, expect } from 'vitest';
import { renderSkillDisplay } from '../../src/ui/skill-display.js';
import { ViewModelFactory } from '../../src/ui/view-model-factory.js';
import { SkillLibrary } from '../../src/engine/skill-library.js';

describe('renderSkillDisplay', () => {
  describe('basic rendering', () => {
    it('should render skill name with color', () => {
      // Given: Skill view model
      const skill = SkillLibrary.getSkill('strike');
      const viewModel = ViewModelFactory.createSkillViewModel(skill);
      
      // When: Render skill display
      const html = renderSkillDisplay(viewModel);
      
      // Then: Should contain skill name and color
      expect(html).toContain('Strike');
      expect(html).toContain(`style="color: ${viewModel.color};"`);
    });
    
    it('should include data-skill-id attribute', () => {
      // Given: Skill view model
      const skill = SkillLibrary.getSkill('heal');
      const viewModel = ViewModelFactory.createSkillViewModel(skill);
      
      // When: Render skill display
      const html = renderSkillDisplay(viewModel);
      
      // Then: Should have skill ID attribute
      expect(html).toContain('data-skill-id="heal"');
    });
    
    it('should include skill-display class', () => {
      // Given: Skill view model
      const skill = SkillLibrary.getSkill('defend');
      const viewModel = ViewModelFactory.createSkillViewModel(skill);
      
      // When: Render skill display
      const html = renderSkillDisplay(viewModel);
      
      // Then: Should have skill-display class
      expect(html).toContain('class="skill-display"');
    });
  });
  
  describe('duration display', () => {
    it('should show duration by default', () => {
      // Given: Skill view model
      const skill = SkillLibrary.getSkill('strike');
      const viewModel = ViewModelFactory.createSkillViewModel(skill);
      
      // When: Render skill display
      const html = renderSkillDisplay(viewModel);
      
      // Then: Should include duration
      expect(html).toContain('skill-duration');
      expect(html).toContain('(2 ticks)');
    });
    
    it('should hide duration when showDuration is false', () => {
      // Given: Skill view model
      const skill = SkillLibrary.getSkill('strike');
      const viewModel = ViewModelFactory.createSkillViewModel(skill);
      
      // When: Render without duration
      const html = renderSkillDisplay(viewModel, { showDuration: false });
      
      // Then: Should not include duration span in main display
      expect(html).not.toContain('skill-duration');
      // Note: Tooltip still contains duration (by design)
    });
  });
  
  describe('tooltip content', () => {
    it('should include tooltip with skill details', () => {
      // Given: Skill view model
      const skill = SkillLibrary.getSkill('strike');
      const viewModel = ViewModelFactory.createSkillViewModel(skill);
      
      // When: Render skill display
      const html = renderSkillDisplay(viewModel);
      
      // Then: Should contain tooltip
      expect(html).toContain('skill-tooltip');
    });
    
    it('should display skill name in tooltip', () => {
      // Given: Skill view model
      const skill = SkillLibrary.getSkill('heal');
      const viewModel = ViewModelFactory.createSkillViewModel(skill);
      
      // When: Render skill display
      const html = renderSkillDisplay(viewModel);
      
      // Then: Tooltip should contain skill name
      expect(html).toContain('<strong>Heal</strong>');
    });
    
    it('should display duration in tooltip', () => {
      // Given: Skill view model
      const skill = SkillLibrary.getSkill('defend');
      const viewModel = ViewModelFactory.createSkillViewModel(skill);
      
      // When: Render skill display
      const html = renderSkillDisplay(viewModel);
      
      // Then: Tooltip should contain duration
      expect(html).toContain('(1 tick)');
    });
    
    it('should display effects summary in tooltip', () => {
      // Given: Skill view model
      const skill = SkillLibrary.getSkill('strike');
      const viewModel = ViewModelFactory.createSkillViewModel(skill);
      
      // When: Render skill display
      const html = renderSkillDisplay(viewModel);
      
      // Then: Tooltip should contain effects
      expect(html).toContain('Deals 15 damage');
    });
    
    it('should display targeting description in tooltip', () => {
      // Given: Skill view model
      const skill = SkillLibrary.getSkill('strike');
      const viewModel = ViewModelFactory.createSkillViewModel(skill);
      
      // When: Render skill display
      const html = renderSkillDisplay(viewModel);
      
      // Then: Tooltip should contain targeting
      expect(html).toContain('<em>Targets lowest HP enemy</em>');
    });
  });
  
  describe('options', () => {
    it('should add custom className', () => {
      // Given: Skill view model and custom class
      const skill = SkillLibrary.getSkill('strike');
      const viewModel = ViewModelFactory.createSkillViewModel(skill);
      
      // When: Render with custom class
      const html = renderSkillDisplay(viewModel, { className: 'my-custom-class' });
      
      // Then: Should include both classes
      expect(html).toContain('class="skill-display my-custom-class"');
    });
    
    it('should render as inline span by default', () => {
      // Given: Skill view model
      const skill = SkillLibrary.getSkill('strike');
      const viewModel = ViewModelFactory.createSkillViewModel(skill);
      
      // When: Render skill display
      const html = renderSkillDisplay(viewModel);
      
      // Then: Should use span tags
      expect(html).toMatch(/^<span/);
      expect(html).toMatch(/<\/span>$/);
    });
    
    it('should render as block div when inline is false', () => {
      // Given: Skill view model
      const skill = SkillLibrary.getSkill('strike');
      const viewModel = ViewModelFactory.createSkillViewModel(skill);
      
      // When: Render as block
      const html = renderSkillDisplay(viewModel, { inline: false });
      
      // Then: Should use div tags
      expect(html).toMatch(/^<div/);
      expect(html).toMatch(/<\/div>$/);
    });
    it('should add selectable class when selectable is true (Phase 2)', () => {
      // Given: Skill view model
      const skill = SkillLibrary.getSkill('strike');
      const viewModel = ViewModelFactory.createSkillViewModel(skill);
      
      // When: Render with selectable option
      const html = renderSkillDisplay(viewModel, { selectable: true });
      
      // Then: Should include selectable class
      expect(html).toContain('skill-display--selectable');
    });
    
    it('should add selected class when selected is true (Phase 2)', () => {
      // Given: Skill view model
      const skill = SkillLibrary.getSkill('strike');
      const viewModel = ViewModelFactory.createSkillViewModel(skill);
      
      // When: Render with selected option
      const html = renderSkillDisplay(viewModel, { selectable: true, selected: true });
      
      // Then: Should include both selectable and selected classes
      expect(html).toContain('skill-display--selectable');
      expect(html).toContain('skill-display--selected');
    });
    
    it('should add disabled class when disabled is true (Phase 2)', () => {
      // Given: Skill view model
      const skill = SkillLibrary.getSkill('strike');
      const viewModel = ViewModelFactory.createSkillViewModel(skill);
      
      // When: Render with disabled option
      const html = renderSkillDisplay(viewModel, { disabled: true });
      
      // Then: Should include disabled class
      expect(html).toContain('skill-display--disabled');
    });
    
    it('should handle multiple modifier classes together (Phase 2)', () => {
      // Given: Skill view model
      const skill = SkillLibrary.getSkill('strike');
      const viewModel = ViewModelFactory.createSkillViewModel(skill);
      
      // When: Render with selectable and selected
      const html = renderSkillDisplay(viewModel, {
        selectable: true,
        selected: true,
        className: 'custom'
      });
      
      // Then: Should include all classes
      expect(html).toContain('skill-display');
      expect(html).toContain('skill-display--selectable');
      expect(html).toContain('skill-display--selected');
      expect(html).toContain('custom');
    });
  });
  
  describe('multiple skills', () => {
    it('should render different skills with different colors', () => {
      // Given: Multiple skills
      const strike = SkillLibrary.getSkill('strike');
      const heal = SkillLibrary.getSkill('heal');
      const strikeVM = ViewModelFactory.createSkillViewModel(strike);
      const healVM = ViewModelFactory.createSkillViewModel(heal);
      
      // When: Render both
      const strikeHtml = renderSkillDisplay(strikeVM);
      const healHtml = renderSkillDisplay(healVM);
      
      // Then: Should have different colors
      expect(strikeHtml).toContain(strikeVM.color);
      expect(healHtml).toContain(healVM.color);
      expect(strikeVM.color).not.toBe(healVM.color);
    });
    
    it('should render different skills with different tooltips', () => {
      // Given: Multiple skills
      const strike = SkillLibrary.getSkill('strike');
      const heal = SkillLibrary.getSkill('heal');
      const strikeVM = ViewModelFactory.createSkillViewModel(strike);
      const healVM = ViewModelFactory.createSkillViewModel(heal);
      
      // When: Render both
      const strikeHtml = renderSkillDisplay(strikeVM);
      const healHtml = renderSkillDisplay(healVM);
      
      // Then: Should have different tooltip content
      expect(strikeHtml).toContain('Deals 15 damage');
      expect(healHtml).toContain('Heals 30 HP');
    });
  });
});
