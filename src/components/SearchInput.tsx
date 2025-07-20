import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Text } from 'react-native';
import TextInput from './TextInput';
import { useAccessibility } from '../hooks/useAccessibility';
import { commonAccessibilityProps } from '../utils/accessibility';
import { asyncDebounce } from '../utils/asyncHandler';
import LoadingSpinner from './LoadingSpinner';

export interface SearchSuggestion {
  id: string;
  title: string;
  subtitle?: string;
  data?: any;
}

export interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSearch?: (query: string) => void;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  suggestions?: SearchSuggestion[];
  loading?: boolean;
  debounceMs?: number;
  minQueryLength?: number;
  maxSuggestions?: number;
  showClearButton?: boolean;
  autoFocus?: boolean;
  style?: any;
  inputStyle?: any;
  suggestionsStyle?: any;
  renderSuggestion?: (suggestion: SearchSuggestion, index: number) => React.ReactNode;
}

const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Search...',
  value: controlledValue,
  onChangeText,
  onSearch,
  onSuggestionSelect,
  suggestions = [],
  loading = false,
  debounceMs = 300,
  minQueryLength = 2,
  maxSuggestions = 10,
  showClearButton = true,
  autoFocus = false,
  style,
  inputStyle,
  suggestionsStyle,
  renderSuggestion,
}) => {
  const [internalValue, setInternalValue] = useState(controlledValue || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<any>(null);
  const { announce, setFocus } = useAccessibility();
  
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const displaySuggestions = suggestions.slice(0, maxSuggestions);

  // Debounced search function
  const debouncedSearch = useCallback(
    asyncDebounce(async (query: string) => {
      if (query.length >= minQueryLength && onSearch) {
        await onSearch(query);
      }
    }, debounceMs),
    [onSearch, minQueryLength, debounceMs]
  );

  // Handle text change
  const handleChangeText = useCallback((text: string) => {
    if (controlledValue === undefined) {
      setInternalValue(text);
    }
    onChangeText?.(text);
    
    // Reset selection when typing
    setSelectedIndex(-1);
    
    // Show/hide suggestions based on query length
    const shouldShow = text.length >= minQueryLength;
    setShowSuggestions(shouldShow);
    
    // Trigger debounced search
    if (shouldShow) {
      debouncedSearch(text);
    }
  }, [controlledValue, onChangeText, minQueryLength, debouncedSearch]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(async (suggestion: SearchSuggestion, index: number) => {
    setSelectedIndex(index);
    setShowSuggestions(false);
    
    if (controlledValue === undefined) {
      setInternalValue(suggestion.title);
    }
    
    onSuggestionSelect?.(suggestion);
    await announce(`Selected ${suggestion.title}`, 'medium');
    
    // Return focus to input
    if (inputRef.current) {
      await setFocus(inputRef);
    }
  }, [controlledValue, onSuggestionSelect, announce, setFocus]);

  // Handle clear button
  const handleClear = useCallback(async () => {
    if (controlledValue === undefined) {
      setInternalValue('');
    }
    onChangeText?.('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    await announce('Search cleared', 'low');
    
    // Focus input after clearing
    if (inputRef.current) {
      await setFocus(inputRef);
    }
  }, [controlledValue, onChangeText, announce, setFocus]);

  // Handle keyboard navigation
  const handleKeyPress = useCallback(async (event: any) => {
    if (!showSuggestions || displaySuggestions.length === 0) return;

    switch (event.nativeEvent.key) {
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = selectedIndex < displaySuggestions.length - 1 ? selectedIndex + 1 : 0;
        setSelectedIndex(nextIndex);
        await announce(`${displaySuggestions[nextIndex].title}, ${nextIndex + 1} of ${displaySuggestions.length}`, 'low');
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : displaySuggestions.length - 1;
        setSelectedIndex(prevIndex);
        await announce(`${displaySuggestions[prevIndex].title}, ${prevIndex + 1} of ${displaySuggestions.length}`, 'low');
        break;
        
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < displaySuggestions.length) {
          await handleSuggestionSelect(displaySuggestions[selectedIndex], selectedIndex);
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        await announce('Search suggestions closed', 'low');
        break;
    }
  }, [showSuggestions, displaySuggestions, selectedIndex, handleSuggestionSelect, announce]);

  // Auto-focus effect
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => {
        setFocus(inputRef);
      }, 100);
    }
  }, [autoFocus, setFocus]);

  // Default suggestion renderer
  const defaultRenderSuggestion = useCallback((suggestion: SearchSuggestion, index: number) => (
    <TouchableOpacity
      key={suggestion.id}
      style={[
        styles.suggestionItem,
        selectedIndex === index && styles.selectedSuggestion,
      ]}
      onPress={() => handleSuggestionSelect(suggestion, index)}
      {...commonAccessibilityProps.button}
      accessibilityLabel={`${suggestion.title}${suggestion.subtitle ? `, ${suggestion.subtitle}` : ''}`}
      accessibilityHint="Double tap to select this suggestion"
      accessibilityState={{ selected: selectedIndex === index }}
    >
      <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
      {suggestion.subtitle && (
        <Text style={styles.suggestionSubtitle}>{suggestion.subtitle}</Text>
      )}
    </TouchableOpacity>
  ), [selectedIndex, handleSuggestionSelect]);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={handleChangeText}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          style={inputStyle}
          rightIcon={
            <View style={styles.rightIconContainer}>
              {loading && (
                <LoadingSpinner size="small" style={styles.loadingIcon} />
              )}
              {showClearButton && value.length > 0 && !loading && (
                <TouchableOpacity
                  onPress={handleClear}
                  style={styles.clearButton}
                  {...commonAccessibilityProps.button}
                  accessibilityLabel="Clear search"
                  accessibilityHint="Double tap to clear search text"
                >
                  <Text style={styles.clearButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          accessibilityRole="search"
          accessibilityLabel="Search input"
          accessibilityHint={`Enter at least ${minQueryLength} characters to see suggestions`}
        />
      </View>

      {showSuggestions && displaySuggestions.length > 0 && (
        <View
          style={[styles.suggestionsContainer, suggestionsStyle]}
          {...commonAccessibilityProps.list}
          accessibilityLabel={`Search suggestions, ${displaySuggestions.length} items`}
        >
          <FlatList
            data={displaySuggestions}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) =>
              renderSuggestion ? renderSuggestion(item, index) : defaultRenderSuggestion(item, index)
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            maxHeight={200}
            nestedScrollEnabled
          />
        </View>
      )}

      {showSuggestions && displaySuggestions.length === 0 && !loading && value.length >= minQueryLength && (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No suggestions found</Text>
        </View>
      )}
    </View>
  );
};

// Search with recent searches component
export interface SearchWithHistoryProps extends SearchInputProps {
  recentSearches?: string[];
  onRecentSearchSelect?: (search: string) => void;
  maxRecentSearches?: number;
  showRecentSearches?: boolean;
}

export const SearchWithHistory: React.FC<SearchWithHistoryProps> = ({
  recentSearches = [],
  onRecentSearchSelect,
  maxRecentSearches = 5,
  showRecentSearches = true,
  ...searchProps
}) => {
  const [showRecent, setShowRecent] = useState(false);
  const { announce } = useAccessibility();

  const displayRecentSearches = recentSearches.slice(0, maxRecentSearches);

  const handleFocus = useCallback(() => {
    if (showRecentSearches && displayRecentSearches.length > 0 && !searchProps.value) {
      setShowRecent(true);
    }
  }, [showRecentSearches, displayRecentSearches.length, searchProps.value]);

  const handleRecentSelect = useCallback(async (search: string) => {
    setShowRecent(false);
    onRecentSearchSelect?.(search);
    await announce(`Selected recent search: ${search}`, 'medium');
  }, [onRecentSearchSelect, announce]);

  const handleChangeText = useCallback((text: string) => {
    setShowRecent(false);
    searchProps.onChangeText?.(text);
  }, [searchProps]);

  return (
    <View style={styles.container}>
      <SearchInput
        {...searchProps}
        onChangeText={handleChangeText}
      />

      {showRecent && displayRecentSearches.length > 0 && (
        <View style={styles.recentSearchesContainer}>
          <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
          {displayRecentSearches.map((search, index) => (
            <TouchableOpacity
              key={index}
              style={styles.recentSearchItem}
              onPress={() => handleRecentSelect(search)}
              {...commonAccessibilityProps.button}
              accessibilityLabel={`Recent search: ${search}`}
              accessibilityHint="Double tap to search for this term"
            >
              <Text style={styles.recentSearchText}>{search}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    position: 'relative',
  },
  rightIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingIcon: {
    marginRight: 8,
  },
  clearButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  clearButtonText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: 'bold',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: 200,
    zIndex: 1001,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedSuggestion: {
    backgroundColor: '#F0F8FF',
  },
  suggestionTitle: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  suggestionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  noResultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1001,
  },
  noResultsText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  recentSearchesContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1001,
  },
  recentSearchesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    padding: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  recentSearchItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  recentSearchText: {
    fontSize: 16,
    color: '#333333',
  },
});

export default SearchInput;