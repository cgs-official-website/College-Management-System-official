import React, { forwardRef, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Eye, EyeOff, LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';
import { radius } from '../../theme/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  /** shows an eye button to toggle visibility */
  isPassword?: boolean;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, icon: Icon, isPassword, required, containerStyle, rightElement, multiline, style, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: colors.text }]}>
          {label}
          {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
        </Text>
      ) : null}

      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.inputBg,
            borderColor,
            minHeight: multiline ? 96 : 50,
            alignItems: multiline ? 'flex-start' : 'center',
          },
        ]}>
        {Icon ? <Icon size={18} color={focused ? colors.primary : colors.textSubtle} style={styles.leftIcon} /> : null}

        <TextInput
          ref={ref}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={isPassword ? hidden : rest.secureTextEntry}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, { color: colors.text, paddingVertical: multiline ? 12 : 0 }, style]}
        />

        {isPassword ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} style={styles.rightIcon}>
            {hidden ? <Eye size={18} color={colors.textSubtle} /> : <EyeOff size={18} color={colors.textSubtle} />}
          </Pressable>
        ) : null}
        {rightElement}
      </View>

      {error ? (
        <Text style={[styles.helper, { color: colors.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.helper, { color: colors.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: 8 },
  field: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  leftIcon: { marginRight: 10 },
  rightIcon: { marginLeft: 10 },
  input: { flex: 1, fontSize: fontSize.md },
  helper: { marginTop: 6, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
});
