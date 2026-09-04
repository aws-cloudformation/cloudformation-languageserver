import { describe, it, expect } from 'vitest';
import { JsonSyntaxTree } from '../../../../src/context/syntaxtree/JsonSyntaxTree';

describe('JSON Fallback for Malformed Documents', () => {
    describe('Incomplete Keys', () => {
        it('should resolve path for incomplete key in Properties', () => {
            const content = `{
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "Buck`;
            const tree = new JsonSyntaxTree(content);
            const node = tree.getNodeAtPosition({ line: 5, character: 13 });
            const pathInfo = tree.getPathAndEntityInfo(node);

            expect(pathInfo.propertyPath).toEqual(['Resources', 'MyBucket', 'Properties', 'Buck']);
            tree.cleanup();
        });

        it('should resolve path for key without value', () => {
            const content = `{
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName":`;
            const tree = new JsonSyntaxTree(content);
            const node = tree.getNodeAtPosition({ line: 5, character: 21 });
            const pathInfo = tree.getPathAndEntityInfo(node);

            expect(pathInfo.propertyPath).toEqual(['Resources', 'MyBucket', 'Properties', 'BucketName']);
            tree.cleanup();
        });
    });

    describe('Array Items', () => {
        it('should resolve path for incomplete array item', () => {
            const content = `{
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "Tags": [
          { "Key":`;
            const tree = new JsonSyntaxTree(content);
            const node = tree.getNodeAtPosition({ line: 6, character: 18 });
            const pathInfo = tree.getPathAndEntityInfo(node);

            expect(pathInfo.propertyPath).toEqual(['Resources', 'MyBucket', 'Properties', 'Tags', 'Key']);
            tree.cleanup();
        });
    });

    describe('Intrinsic Functions', () => {
        it('should resolve path for incomplete Fn::Sub', () => {
            const content = `{
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": { "Fn::Sub":`;
            const tree = new JsonSyntaxTree(content);
            const node = tree.getNodeAtPosition({ line: 5, character: 34 });
            const pathInfo = tree.getPathAndEntityInfo(node);

            expect(pathInfo.propertyPath).toEqual(['Resources', 'MyBucket', 'Properties', 'BucketName', 'Fn::Sub']);

            tree.cleanup();
        });
    });

    describe('Invalid top-level keys', () => {
        it('should not attach an unterminated key to neighboring sections', () => {
            const content = `{
  "AWSTemplateFormatVersion": "date",
  "Hello1
  "Resources": {
    "MyBucket": {}
  }
}`;
            const tree = new JsonSyntaxTree(content);
            const node = tree.getNodeAtPosition({ line: 2, character: 8 });
            const pathInfo = tree.getPathAndEntityInfo(node);

            expect(pathInfo.propertyPath).toHaveLength(1);
            expect(String(pathInfo.propertyPath[0]).trim()).toBe('Hello1');
            tree.cleanup();
        });
    });

    describe('Nested ERROR nodes', () => {
        it('should preserve outer object paths for a partial nested key', () => {
            const content = `{
  "Outer": {
    "Inner": {
      "par"`;
            const tree = new JsonSyntaxTree(content);
            const node = tree.getNodeAtPosition({ line: 3, character: 10 });
            const pathInfo = tree.getPathAndEntityInfo(node);

            expect(pathInfo.propertyPath).toEqual(['Outer', 'Inner', 'par']);
            tree.cleanup();
        });

        it('should recover a nested key after multibyte text', () => {
            const content = `{
  "Description": "café ☕",
  "Outer": {
    "Inner": {
      "par"`;
            const tree = new JsonSyntaxTree(content);
            const node = tree.getNodeAtPosition({ line: 4, character: 10 });
            const pathInfo = tree.getPathAndEntityInfo(node);

            expect(pathInfo.propertyPath).toEqual(['Outer', 'Inner', 'par']);
            tree.cleanup();
        });

        it('should preserve the property key without adding its partial scalar value', () => {
            const content = `{
  "Outer": {
    "Inner": {
      "Setting": "val"`;
            const tree = new JsonSyntaxTree(content);
            const node = tree.getNodeAtPosition({ line: 3, character: 21 });
            const pathInfo = tree.getPathAndEntityInfo(node);

            expect(pathInfo.propertyPath).toEqual(['Outer', 'Inner', 'Setting']);
            tree.cleanup();
        });
    });
});
